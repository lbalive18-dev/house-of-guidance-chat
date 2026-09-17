import { useCallback, useEffect, useRef, useState } from 'react';
import { getEcho } from '@/lib/echo';
import {
  acceptCall,
  cancelCall,
  declineCall,
  endCall,
  fetchActiveCall,
  fetchCall,
  fetchIceServers,
  joinCall,
  leaveCall,
  leaveCallBeacon,
  sendHeartbeat,
  sendSignal,
  startCall,
  updateMediaState,
} from '@/lib/callApi';
import {
  MeshTransport,
  isWebRtcSupported,
  stopMediaStream,
} from '@/lib/webrtc/transport';
import type {
  CallMedia,
  CallParticipant,
  CallSession,
  CallViewState,
  RemotePeer,
} from '@/types/call';

const HEARTBEAT_MS = 30000;

interface UseCallOptions {
  conversationId: number | undefined;
  currentUserId: number | undefined;
  conversationType?: string;
}

const CALL_EVENTS = [
  'call.initiated',
  'call.accepted',
  'call.declined',
  'call.cancelled',
  'call.ended',
  'call.signal',
  'call.participant.joined',
  'call.participant.left',
] as const;

export function useCall({ conversationId, currentUserId }: UseCallOptions) {
  const [viewState, setViewState] = useState<CallViewState>('idle');
  const [session, setSession] = useState<CallSession | null>(null);
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [error, setError] = useState('');
  const [endReason, setEndReason] = useState('');

  const transportRef = useRef<MeshTransport | null>(null);
  const sessionRef = useRef<CallSession | null>(null);
  const pendingOffers = useRef(new Map<number, RTCSessionDescriptionInit>());
  const mountedRef = useRef(true);

  sessionRef.current = session;

  const refreshSession = useCallback(async (sessionId: number) => {
    try {
      const fresh = await fetchCall(sessionId);
      if (!mountedRef.current) return;
      setSession(fresh);
      setParticipants(fresh.participants ?? []);
      return fresh;
    } catch {
      return undefined;
    }
  }, []);

  const teardownMedia = useCallback(() => {
    transportRef.current?.close();
    transportRef.current = null;
    setLocalStream((current) => {
      stopMediaStream(current);
      return null;
    });
    setRemotePeers([]);
    pendingOffers.current.clear();
  }, []);

  const leaveQuietly = useCallback((sessionId: number) => {
    leaveCallBeacon(sessionId);
  }, []);

  // ---- media -----------------------------------------------------------

  const acquireMedia = useCallback(async (media: CallMedia): Promise<MediaStream> => {
    if (!isWebRtcSupported()) {
      throw new Error('Your browser does not support voice/video calls.');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: media === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      });
      transportRef.current?.setLocalStream(stream);
      return stream;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        throw new Error('Microphone/camera permission was denied. Allow access and try again.');
      }
      if (err instanceof DOMException && (err.name === 'NotFoundError' || err.name === 'OverconstrainedError')) {
        throw new Error('No microphone or camera was found on this device.');
      }
      throw new Error('Could not start your microphone/camera.');
    }
  }, []);

  const ensureTransport = useCallback(
    async (sessionId: number): Promise<MeshTransport> => {
      if (transportRef.current) return transportRef.current;

      const config = await fetchIceServers();
      const transport = new MeshTransport(currentUserId ?? 0, config, {
        onRemoteStream: (userId, stream) => {
          setRemotePeers((current) => {
            const existing = current.find((p) => p.userId === userId);
            if (existing) {
              return current.map((p) => (p.userId === userId ? { ...p, stream } : p));
            }
            return [...current, { userId, stream, connectionState: 'new', isMuted: false, isCameraOff: false }];
          });
        },
        onConnectionState: (userId, state) => {
          setRemotePeers((current) =>
            current.map((p) => (p.userId === userId ? { ...p, connectionState: state } : p)),
          );
        },
        onSignalSend: (toUserId, signalType, payload) => {
          sendSignal(sessionId, { to_user_id: toUserId, signal_type: signalType, payload }).catch(() => {
            // Signaling is fire-and-forget; ICE retries and re-offers cover drops.
          });
        },
      });

      transportRef.current = transport;
      return transport;
    },
    [currentUserId],
  );

  const processPendingOffers = useCallback(async () => {
    const transport = transportRef.current;
    if (!transport) return;
    for (const [userId, offer] of pendingOffers.current) {
      pendingOffers.current.delete(userId);
      try {
        await transport.handleOffer(userId, offer);
      } catch {
        // corrupted offer — the peer will re-offer on rejoin
      }
    }
  }, []);

  const offerToJoinedPeers = useCallback(
    async (fresh: CallSession) => {
      const transport = transportRef.current;
      if (!transport || currentUserId === undefined) return;

      for (const participant of fresh.participants ?? []) {
        if (participant.user_id === currentUserId) continue;
        if (participant.status !== 'joined') continue;
        if (!transport.shouldOfferTo(participant.user_id)) continue;
        try {
          await transport.makeOffer(participant.user_id);
        } catch {
          // peer will connect when it (re)joins
        }
      }
    },
    [currentUserId],
  );

  // ---- actions ----------------------------------------------------------

  const begin = useCallback(
    async (media: CallMedia) => {
      if (!conversationId) return;
      setError('');
      try {
        const created = await startCall(conversationId, media);
        setSession(created);
        setParticipants(created.participants ?? []);
        setIsCameraOff(media === 'audio');
        setViewState('outgoing');
        const transport = await ensureTransport(created.id);
        void transport;
        const stream = await acquireMedia(media);
        if (!mountedRef.current) {
          stopMediaStream(stream);
          return;
        }
        setLocalStream(stream);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not start the call.');
        setViewState('failed');
      }
    },
    [conversationId, acquireMedia, ensureTransport],
  );

  const accept = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return;
    setError('');
    try {
      const updated = await acceptCall(current.id);
      setSession(updated);
      setParticipants(updated.participants ?? []);
      setViewState('connecting');
      await ensureTransport(updated.id);
      const stream = await acquireMedia(updated.media);
      if (!mountedRef.current) {
        stopMediaStream(stream);
        return;
      }
      setLocalStream(stream);
      setIsCameraOff(updated.media === 'audio');
      await processPendingOffers();
      const fresh = await refreshSession(updated.id);
      if (fresh) {
        await offerToJoinedPeers(fresh);
        if (mountedRef.current) setViewState('connected');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join the call.');
      setViewState('failed');
    }
  }, [acquireMedia, ensureTransport, offerToJoinedPeers, processPendingOffers, refreshSession]);

  const join = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return;
    setError('');
    try {
      const updated = await joinCall(current.id);
      setSession(updated);
      setParticipants(updated.participants ?? []);
      setViewState('connecting');
      await ensureTransport(updated.id);
      const stream = await acquireMedia(updated.media);
      if (!mountedRef.current) {
        stopMediaStream(stream);
        return;
      }
      setLocalStream(stream);
      setIsCameraOff(updated.media === 'audio');
      await processPendingOffers();
      const fresh = await refreshSession(updated.id);
      if (fresh) {
        await offerToJoinedPeers(fresh);
        if (mountedRef.current) setViewState('connected');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join the call.');
      setViewState('failed');
    }
  }, [acquireMedia, ensureTransport, offerToJoinedPeers, processPendingOffers, refreshSession]);

  const decline = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return;
    try {
      await declineCall(current.id);
    } finally {
      if (mountedRef.current) {
        setViewState('idle');
        setSession(null);
        setParticipants([]);
      }
    }
  }, []);

  const cancel = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return;
    try {
      await cancelCall(current.id);
    } finally {
      teardownMedia();
      if (mountedRef.current) {
        setViewState('idle');
        setSession(null);
        setParticipants([]);
      }
    }
  }, [teardownMedia]);

  const end = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return;
    try {
      await endCall(current.id);
    } finally {
      teardownMedia();
      if (mountedRef.current) {
        setViewState('idle');
        setSession(null);
        setParticipants([]);
      }
    }
  }, [teardownMedia]);

  const leave = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return;
    try {
      await leaveCall(current.id);
    } finally {
      teardownMedia();
      if (mountedRef.current) {
        setViewState('idle');
        setSession(null);
        setParticipants([]);
        setRemotePeers([]);
      }
    }
  }, [teardownMedia]);

  const toggleMute = useCallback(async () => {
    const current = sessionRef.current;
    const stream = localStream;
    const next = !isMuted;
    stream?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setIsMuted(next);
    if (current) {
      try {
        await updateMediaState(current.id, { is_muted: next });
      } catch {
        // local mute still applies; sync resumes on rejoin
      }
    }
  }, [isMuted, localStream]);

  const toggleCamera = useCallback(async () => {
    const current = sessionRef.current;
    const next = !isCameraOff;
    localStream?.getVideoTracks().forEach((track) => {
      track.enabled = !next;
    });
    setIsCameraOff(next);
    if (current) {
      try {
        await updateMediaState(current.id, { is_camera_off: next });
      } catch {
        // local toggle still applies
      }
    }
  }, [isCameraOff, localStream]);

  /**
   * Adopt a session created outside this hook (e.g. a room call started
   * from a panel button) and bring up local media for it.
   */
  const adoptSession = useCallback(
    async (created: CallSession) => {
      setError('');
      setSession(created);
      setParticipants(created.participants ?? []);
      setIsCameraOff(created.media === 'audio');
      setViewState(created.initiator_id === currentUserId ? 'outgoing' : 'incoming');
      try {
        await ensureTransport(created.id);
        const stream = await acquireMedia(created.media);
        if (!mountedRef.current) {
          stopMediaStream(stream);
          return;
        }
        setLocalStream(stream);
        await processPendingOffers();
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Could not start media.');
          setViewState('failed');
        }
      }
    },
    [acquireMedia, currentUserId, ensureTransport, processPendingOffers],
  );

  const dismiss = useCallback(() => {
    teardownMedia();
    setViewState('idle');
    setSession(null);
    setParticipants([]);
    setRemotePeers([]);
    setError('');
    setEndReason('');
  }, [teardownMedia]);

  // ---- initial load ------------------------------------------------------

  useEffect(() => {
    mountedRef.current = true;
    if (!conversationId || currentUserId === undefined) return;

    fetchActiveCall(conversationId)
      .then((active) => {
        if (!mountedRef.current || !active) return;
        setSession(active);
        setParticipants(active.participants ?? []);
        const me = active.participants?.find((p) => p.user_id === currentUserId);
        if (active.initiator_id === currentUserId && active.status === 'ringing') {
          setViewState('outgoing');
        } else if (me?.status === 'joined') {
          setViewState('connecting');
          void (async () => {
            try {
              await ensureTransport(active.id);
              const stream = await acquireMedia(active.media);
              if (!mountedRef.current) {
                stopMediaStream(stream);
                return;
              }
              setLocalStream(stream);
              const fresh = await refreshSession(active.id);
              if (fresh) {
                await offerToJoinedPeers(fresh);
                if (mountedRef.current) setViewState('connected');
              }
            } catch (err) {
              if (mountedRef.current) {
                setError(err instanceof Error ? err.message : 'Could not join the call.');
                setViewState('failed');
              }
            }
          })();
        } else if (me?.status === 'invited' && active.status === 'ringing') {
          setViewState('incoming');
        }
      })
      .catch(() => {
        // no live call — idle
      });
  }, [conversationId, currentUserId, acquireMedia, ensureTransport, offerToJoinedPeers, refreshSession]);

  // ---- realtime signaling --------------------------------------------------

  useEffect(() => {
    if (!conversationId || currentUserId === undefined) return;
    const echo = getEcho();
    const channel = echo.private(`conversation.${conversationId}`);

    const onInitiated = (payload: { session: CallSession }) => {
      if (!mountedRef.current) return;
      const incoming = payload.session;
      setSession(incoming);
      setParticipants(incoming.participants ?? []);
      if (incoming.initiator_id === currentUserId) {
        setViewState((v) => (v === 'idle' ? 'outgoing' : v));
      } else {
        setViewState('incoming');
      }
    };

    const onAccepted = (payload: { session_id: number; user_id: number }) => {
      if (sessionRef.current?.id !== payload.session_id) return;
      void refreshSession(payload.session_id).then((fresh) => {
        if (fresh && mountedRef.current) void offerToJoinedPeers(fresh);
      });
      if (mountedRef.current && sessionRef.current?.initiator_id === currentUserId) {
        setViewState('connected');
      }
    };

    const onParticipantJoined = (payload: {
      session_id: number;
      user_id: number;
      is_muted: boolean;
      is_camera_off: boolean;
    }) => {
      if (sessionRef.current?.id !== payload.session_id) return;
      void refreshSession(payload.session_id).then((fresh) => {
        if (fresh && mountedRef.current) void offerToJoinedPeers(fresh);
      });
      setRemotePeers((current) => {
        if (current.some((p) => p.userId === payload.user_id)) return current;
        return [
          ...current,
          {
            userId: payload.user_id,
            stream: null,
            connectionState: 'new',
            isMuted: payload.is_muted,
            isCameraOff: payload.is_camera_off,
          },
        ];
      });
    };

    const onParticipantLeft = (payload: { session_id: number; user_id: number }) => {
      if (sessionRef.current?.id !== payload.session_id) return;
      transportRef.current?.removePeer(payload.user_id);
      setRemotePeers((current) => current.filter((p) => p.userId !== payload.user_id));
      void refreshSession(payload.session_id);
      if (payload.user_id === currentUserId && mountedRef.current) {
        teardownMedia();
        setViewState('idle');
        setSession(null);
      }
    };

    const onDeclined = (payload: { session_id: number; user_id: number }) => {
      if (sessionRef.current?.id !== payload.session_id) return;
      void refreshSession(payload.session_id);
    };

    const onCancelled = (payload: { session_id: number }) => {
      if (sessionRef.current?.id !== payload.session_id) return;
      teardownMedia();
      if (mountedRef.current) {
        setEndReason('cancelled');
        setViewState('ended');
      }
    };

    const onEnded = (payload: { session_id: number; reason: string }) => {
      if (sessionRef.current?.id !== payload.session_id) return;
      teardownMedia();
      if (mountedRef.current) {
        setEndReason(payload.reason);
        setViewState('ended');
      }
    };

    const onSignal = (payload: {
      session_id: number;
      from_user_id: number;
      to_user_id: number | null;
      signal_type: 'offer' | 'answer' | 'ice';
      payload: Record<string, unknown>;
    }) => {
      if (sessionRef.current?.id !== payload.session_id) return;
      if (payload.from_user_id === currentUserId) return;
      if (payload.to_user_id !== null && payload.to_user_id !== currentUserId) return;

      const transport = transportRef.current;
      if (!transport) {
        if (payload.signal_type === 'offer') {
          pendingOffers.current.set(payload.from_user_id, {
            sdp: payload.payload.sdp as string,
            type: 'offer',
          });
        }
        return;
      }

      void (async () => {
        try {
          if (payload.signal_type === 'offer') {
            await transport.handleOffer(payload.from_user_id, {
              sdp: payload.payload.sdp as string,
              type: 'offer',
            });
            if (mountedRef.current) setViewState('connected');
          } else if (payload.signal_type === 'answer') {
            await transport.handleAnswer(payload.from_user_id, {
              sdp: payload.payload.sdp as string,
              type: 'answer',
            });
            if (mountedRef.current) setViewState('connected');
          } else {
            await transport.handleIce(payload.from_user_id, {
              candidate: payload.payload.candidate as string,
              sdpMid: payload.payload.sdpMid as string,
              sdpMLineIndex: payload.payload.sdpMLineIndex as number,
            });
          }
        } catch {
          // malformed signal — ignore, peers renegotiate on rejoin
        }
      })();
    };

    channel.listen('.call.initiated', onInitiated);
    channel.listen('.call.accepted', onAccepted);
    channel.listen('.call.participant.joined', onParticipantJoined);
    channel.listen('.call.participant.left', onParticipantLeft);
    channel.listen('.call.declined', onDeclined);
    channel.listen('.call.cancelled', onCancelled);
    channel.listen('.call.ended', onEnded);
    channel.listen('.call.signal', onSignal);

    return () => {
      for (const event of CALL_EVENTS) {
        try {
          channel.stopListening(event);
        } catch {
          // channel already gone
        }
      }
    };
  }, [conversationId, currentUserId, offerToJoinedPeers, refreshSession, teardownMedia]);

  // ---- heartbeat -------------------------------------------------------------

  useEffect(() => {
    if (viewState !== 'connected' && viewState !== 'connecting') return;
    const id = sessionRef.current?.id;
    if (!id) return;
    const timer = window.setInterval(() => {
      sendHeartbeat(id).catch(() => {
        // prune service + reconnect UX cover extended outages
      });
    }, HEARTBEAT_MS);
    return () => window.clearInterval(timer);
  }, [viewState]);

  // ---- unload safety: never strand tracks or sessions -------------------------

  useEffect(() => {
    const handleUnload = () => {
      const id = sessionRef.current?.id;
      if (id) leaveQuietly(id);
      stopMediaStream(localStream);
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [leaveQuietly, localStream]);

  useEffect(() => {
    const id = session?.id;
    return () => {
      if (id) leaveQuietly(id);
      transportRef.current?.close();
      transportRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const me = participants.find((p) => p.user_id === currentUserId);
  const joinedPeers = participants.filter(
    (p) => p.status === 'joined' && p.user_id !== currentUserId,
  );

  return {
    viewState,
    session,
    participants,
    me,
    joinedPeers,
    localStream,
    remotePeers,
    isMuted,
    isCameraOff,
    error,
    endReason,
    begin,
    adoptSession,
    accept,
    decline,
    cancel,
    end,
    leave,
    join,
    toggleMute,
    toggleCamera,
    dismiss,
    refreshSession,
  };
}

export type UseCallReturn = ReturnType<typeof useCall>;
