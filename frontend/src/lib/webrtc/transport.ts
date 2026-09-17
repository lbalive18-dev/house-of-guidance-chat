/**
 * Media transport abstraction.
 *
 * Session management, signaling, participant state, and seats live in
 * useCall + the Laravel API. THIS layer only moves media. The initial
 * strategy below is a managed mesh (one RTCPeerConnection per remote
 * peer); a future SFU transport implements the same interface —
 * connect/disconnect per peer, remote-stream callbacks — so swapping
 * transports never touches call logic or UI.
 */

export interface TransportEvents {
  onRemoteStream: (userId: number, stream: MediaStream) => void;
  onConnectionState: (userId: number, state: RTCPeerConnectionState) => void;
  onSignalSend: (toUserId: number, signalType: 'offer' | 'answer' | 'ice', payload: Record<string, unknown>) => void;
}

export interface CallTransport {
  setLocalStream(stream: MediaStream): void;
  ensurePeer(userId: number): Promise<RTCPeerConnection>;
  handleOffer(userId: number, offer: RTCSessionDescriptionInit): Promise<void>;
  handleAnswer(userId: number, answer: RTCSessionDescriptionInit): Promise<void>;
  handleIce(userId: number, candidate: RTCIceCandidateInit): Promise<void>;
  removePeer(userId: number): void;
  connectionState(userId: number): RTCPeerConnectionState | undefined;
  peerIds(): number[];
  close(): void;
}

export function createPeerConnection(
  config: RTCConfiguration,
  localStream: MediaStream | null,
  onTrack: (stream: MediaStream) => void,
): RTCPeerConnection {
  const pc = new RTCPeerConnection(config);

  if (localStream) {
    for (const track of localStream.getTracks()) {
      pc.addTrack(track, localStream);
    }
  }

  pc.ontrack = (event) => {
    const [stream] = event.streams;
    if (stream) onTrack(stream);
  };

  return pc;
}

/**
 * Initial strategy: deterministic mesh. The HIGHER user id always offers,
 * which removes offer glare without any extra negotiation round-trips.
 * Practical for 1-to-1 and small groups; replace with an SFU transport
 * (same interface) as usage grows.
 */
export class MeshTransport implements CallTransport {
  private peers = new Map<number, RTCPeerConnection>();
  private localStream: MediaStream | null = null;

  constructor(
    private selfId: number,
    private config: RTCConfiguration,
    private events: TransportEvents,
  ) {}

  setLocalStream(stream: MediaStream): void {
    this.localStream = stream;
    for (const pc of this.peers.values()) {
      for (const track of stream.getTracks()) {
        if (!pc.getSenders().some((sender) => sender.track === track)) {
          pc.addTrack(track, stream);
        }
      }
    }
  }

  /** Am I the offerer for this pair? Higher id offers. */
  shouldOfferTo(userId: number): boolean {
    return this.selfId > userId;
  }

  async ensurePeer(userId: number): Promise<RTCPeerConnection> {
    const existing = this.peers.get(userId);
    if (existing) return existing;

    const pc = createPeerConnection(
      this.config,
      this.localStream,
      (stream) => this.events.onRemoteStream(userId, stream),
    );

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.events.onSignalSend(userId, 'ice', event.candidate.toJSON() as unknown as Record<string, unknown>);
      }
    };

    pc.onconnectionstatechange = () => {
      this.events.onConnectionState(userId, pc.connectionState);
    };

    this.peers.set(userId, pc);
    return pc;
  }

  async makeOffer(userId: number): Promise<void> {
    const pc = await this.ensurePeer(userId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.events.onSignalSend(userId, 'offer', { sdp: offer.sdp, type: offer.type });
  }

  async handleOffer(userId: number, offer: RTCSessionDescriptionInit): Promise<void> {
    const pc = await this.ensurePeer(userId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.events.onSignalSend(userId, 'answer', { sdp: answer.sdp, type: answer.type });
  }

  async handleAnswer(userId: number, answer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peers.get(userId);
    if (!pc) return;
    if (pc.signalingState !== 'have-local-offer') return;
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async handleIce(userId: number, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.peers.get(userId);
    if (!pc || !pc.remoteDescription) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      // Late/duplicate candidates are routine; the connection proceeds.
    }
  }

  removePeer(userId: number): void {
    const pc = this.peers.get(userId);
    if (pc) {
      try {
        pc.close();
      } finally {
        this.peers.delete(userId);
      }
    }
  }

  connectionState(userId: number): RTCPeerConnectionState | undefined {
    return this.peers.get(userId)?.connectionState;
  }

  peerIds(): number[] {
    return [...this.peers.keys()];
  }

  close(): void {
    for (const userId of this.peerIds()) this.removePeer(userId);
    this.localStream = null;
  }
}

export function stopMediaStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => {
    try {
      track.stop();
    } catch {
      // already stopped
    }
  });
}

export function isWebRtcSupported(): boolean {
  return (
    typeof RTCPeerConnection !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  );
}
