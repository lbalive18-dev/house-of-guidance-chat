import { useCallback, useEffect, useRef, useState } from 'react';
import { getEcho } from '@/lib/echo';
import { apiErrorMessage } from '@/lib/apiError';
import { unlockCallAudio, useRingtone } from '@/hooks/useRingtone';
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
const PRIVATE_CALL_RING_TIMEOUT_MS = 45000;
const PRIVATE_CALL_STATUS_POLL_MS = 5000;
const GROUP_CALL_STATUS_POLL_MS = 5000;
const CONNECTING_RECOVERY_POLL_MS = 6000;

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
  const offerRetryTimers = useRef(new Map<number, number>());
  const mountedRef = useRef(true);

  sessionRef.current = session;

  useRingtone(viewState === 'outgoing' && session?.status === 'ringing', 'outgoing');

  const clearOfferRetry = useCallback((userId: number) => {
    const timer = offerRetryTimers.current.get(userId);
    if (timer !== undefined) window.clearTimeout(timer);
    offerRetryTimers.current.delete(userId);
  }, []);

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
    for (const timer of offerRetryTimers.current.values()) window.clearTimeout(timer);
    offerRetryTimers.current.clear();
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
          const connectionState = transportRef.current?.connectionState(userId) ?? 'new';
          setRemotePeers((current) => {
            const existing = current.find((p) => p.userId === userId);
            if (existing) {
              return current.map((p) => (p.userId === userId ? { ...p, stream, connectionState } : p));
            }
            return [...current, { userId, stream, connectionState, isMuted: false, isCameraOff: false }];
          });
        },
        onConnectionState: (userId, state) => {
          setRemotePeers((current) => {
            const existing = current.find((peer) => peer.userId === userId);
            if (existing) {
              return current.map((peer) => (peer.userId === userId ? { ...peer, connectionState: state } : peer));
            }
            return [...current, { userId, stream: null, connectionState: state, isMuted: false, isCameraOff: false }];
          });
          if (state === 'failed') {
            setError('The media connection failed. This network may need a TURN relay to reach the other device.');
          } else if (state === 'connected') {
            setError('');
          }
        },
        onSignalSend: (toUserId, signalType, payload) => {
          const envelope = { to_user_id: toUserId, signal_type: signalType, payload } as const;
          sendSignal(sessionId, envelope).catch(() => {
            // Signaling is fire-and-forget; ICE retries and re-offers cover drops.
          });

          // The callee enters the call after accepting. Retry the same offer
          // briefly so a slow Reverb subscription cannot lose negotiation.
          if (signalType === 'offer' && toUserId !== null) {
            clearOfferRetry(toUserId);
            let attempts = 0;
            const retry = () => {
              if (
                !mountedRef.current ||
                sessionRef.current?.id !== sessionId ||
                transportRef.current?.connectionState(toUserId) === 'connected' ||
                attempts >= 5
              ) {
                clearOfferRetry(toUserId);
                return;
              }

              attempts += 1;
              void sendSignal(sessionId, envelope).catch(() => undefined);
              offerRetryTimers.current.set(toUserId, window.setTimeout(retry, 1500));
            };
            offerRetryTimers.current.set(toUserId, window.setTimeout(retry, 1200));
          }
        },
      });

      transportRef.current = transport;
      return transport;
    },
    [clearOfferRetry, currentUserId],
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
      unlockCallAudio();
      if (!conversationId) return;
      setError('');
      let created: CallSession | null = null;
      try {
        created = await startCall(conversationId, media);
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
        if (created) {
          try {
            await endCall(created.id);
          } catch {
            // The server's stale-call cleanup is the backstop if the network
            // also prevents cleanup after local media setup fails.
          }
        }
        teardownMedia();
        if (mountedRef.current) {
          setSession(null);
          setParticipants([]);
        }
        setError(apiErrorMessage(err, 'Could not start the call.'));
        setViewState('failed');
      }
    },
    [conversationId, acquireMedia, ensureTransport, teardownMedia],
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
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not cancel the call. Please try again.'));
      await refreshSession(current.id);
      return;
    }

    teardownMedia();
    if (mountedRef.current) {
      setViewState('idle');
      setSession(null);
      setParticipants([]);
    }
  }, [refreshSession, teardownMedia]);

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

  // Last-seen is necessarily approximate, so a caller can briefly reach a
  // user who has just closed the app. Poll acceptance and end unanswered
  // one-to-one calls promptly so they cannot strand a live session.
  const outgoingSessionId = session?.id;
  const outgoingSessionStatus = session?.status;
  const outgoingSessionType = session?.type;
  const outgoingInitiatorId = session?.initiator_id;

  useEffect(() => {
    if (
      viewState !== 'outgoing' ||
      outgoingSessionStatus !== 'ringing' ||
      outgoingSessionType !== 'private' ||
      outgoingInitiatorId !== currentUserId ||
      outgoingSessionId === undefined
    ) {
      return;
    }

    let stopped = false;
    const sessionId = outgoingSessionId;

    const checkRecipient = async () => {
      const fresh = await refreshSession(sessionId);
      if (stopped || !fresh) return false;

      const recipientJoined = fresh.participants?.some(
        (participant) => participant.user_id !== currentUserId && participant.status === 'joined',
      );

      if (fresh.status === 'active' || recipientJoined) {
        setViewState('connecting');
        await offerToJoinedPeers(fresh);
        return true;
      }

      return false;
    };

    const poll = window.setInterval(() => {
      void checkRecipient();
    }, PRIVATE_CALL_STATUS_POLL_MS);

    const timeout = window.setTimeout(() => {
      void (async () => {
        if (await checkRecipient() || stopped) return;

        try {
          await cancelCall(sessionId);
        } catch {
          const fresh = await refreshSession(sessionId);
          if (fresh?.status === 'ringing' && mountedRef.current) {
            setError('No answer yet. Please cancel the call before trying again.');
            return;
          }
        }

        if (stopped || !mountedRef.current || sessionRef.current?.id !== sessionId) return;
        teardownMedia();
        setEndReason('missed');
        setViewState('ended');
      })();
    }, PRIVATE_CALL_RING_TIMEOUT_MS);

    return () => {
      stopped = true;
      window.clearInterval(poll);
      window.clearTimeout(timeout);
    };
  }, [
    currentUserId,
    offerToJoinedPeers,
    outgoingInitiatorId,
    outgoingSessionId,
    outgoingSessionStatus,
    outgoingSessionType,
    refreshSession,
    teardownMedia,
    viewState,
  ]);

  // Group/room outgoing recovery: Reverb join events can be missed while a
  // subscription reconnects. Poll for newly-joined peers and offer to them
  // so a slow bus cannot strand a live circle. Unlike private calls there is
  // no auto-cancel timeout — room calls intentionally persist.
  useEffect(() => {
    if (
      viewState !== 'outgoing' ||
      outgoingSessionStatus !== 'ringing' ||
      outgoingSessionType === 'private' ||
      outgoingSessionType === undefined ||
      outgoingInitiatorId !== currentUserId ||
      outgoingSessionId === undefined
    ) {
      return;
    }

    let stopped = false;
    const sessionId = outgoingSessionId;

    const checkJoined = async () => {
      const fresh = await refreshSession(sessionId);
      if (stopped || !fresh) return;

      const anyoneJoined = fresh.participants?.some(
        (participant) => participant.user_id !== currentUserId && participant.status === 'joined',
      );

      if (fresh.status === 'active' || anyoneJoined) {
        setViewState('connecting');
        await offerToJoinedPeers(fresh);
      } else {
        // Still ringing with nobody joined — keep the local offer retry
        // timers alive by re-offering to any joined peer snapshot.
        await offerToJoinedPeers(fresh);
      }
    };

    const poll = window.setInterval(() => {
      void checkJoined();
    }, GROUP_CALL_STATUS_POLL_MS);

    return () => {
      stopped = true;
      window.clearInterval(poll);
    };
  }, [
    currentUserId,
    offerToJoinedPeers,
    outgoingInitiatorId,
    outgoingSessionId,
    outgoingSessionStatus,
    outgoingSessionType,
    refreshSession,
    viewState,
  ]);

  // Connecting-state recovery (all call types): if signalling was lost, the
  // UI can sit in "connecting" with joined peers but no peer connection.
  // Periodically re-sync the session and re-offer — makeOffer is a safe
  // no-op when negotiation is already stable or in flight.
  useEffect(() => {
    if (viewState !== 'connecting' || outgoingSessionId === undefined) {
      return;
    }

    let stopped = false;
    const sessionId = outgoingSessionId;

    const recover = async () => {
      if (stopped) return;
      // Skip once media is actually flowing.
      if (transportRef.current) {
        const ids = transportRef.current.peerIds();
        if (ids.some((id) => transportRef.current?.connectionState(id) === 'connected')) return;
      }
      const fresh = await refreshSession(sessionId);
      if (stopped || !fresh) return;
      if (sessionRef.current?.id !== sessionId) return;
      await processPendingOffers();
      await offerToJoinedPeers(fresh);
    };

    const poll = window.setInterval(() => {
      void recover();
    }, CONNECTING_RECOVERY_POLL_MS);

    return () => {
      stopped = true;
      window.clearInterval(poll);
    };
  }, [offerToJoinedPeers, outgoingSessionId, processPendingOffers, refreshSession, viewState]);

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
        setViewState('connecting');
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
      clearOfferRetry(payload.user_id);
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
      clearOfferRetry(payload.user_id);
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
          } else if (payload.signal_type === 'answer') {
            clearOfferRetry(payload.from_user_id);
            await transport.handleAnswer(payload.from_user_id, {
              sdp: payload.payload.sdp as string,
              type: 'answer',
            });
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
  }, [clearOfferRetry, conversationId, currentUserId, offerToJoinedPeers, refreshSession, teardownMedia]);

  // Signaling and API acceptance only mean the peers exchanged setup data.
  // Mark a call live only after an actual peer connection is established.
  useEffect(() => {
    if (remotePeers.some((peer) => peer.connectionState === 'connected')) {
      if (viewState !== 'connected') setViewState('connected');
    } else if (viewState === 'connected' && remotePeers.length > 0) {
      setViewState('connecting');
    }
  }, [remotePeers, viewState]);

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
