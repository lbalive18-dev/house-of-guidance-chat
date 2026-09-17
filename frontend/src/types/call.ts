export type CallType = 'private' | 'group' | 'room';
export type CallMedia = 'audio' | 'video';
export type CallStatus = 'ringing' | 'active' | 'ended';
export type CallParticipantStatus =
  | 'invited'
  | 'joined'
  | 'declined'
  | 'missed'
  | 'left'
  | 'removed';

export interface CallUser {
  id: number;
  name: string;
  avatar_url: string | null;
}

export interface CallParticipant {
  id: number;
  user_id: number;
  status: CallParticipantStatus;
  is_muted: boolean;
  is_camera_off: boolean;
  joined_at: string | null;
  left_at: string | null;
  user?: CallUser;
}

export interface CallSession {
  id: number;
  type: CallType;
  media: CallMedia;
  conversation_id: number;
  initiator_id: number;
  status: CallStatus;
  started_at: string | null;
  ended_at: string | null;
  initiator?: CallUser;
  participants?: CallParticipant[];
}

export interface RoomSeatState {
  seat_number: number;
  user_id: number | null;
  user: CallUser | null;
}

export interface RoomCallState {
  seat_capacity: number;
  seats: RoomSeatState[];
  active_call_id: number | null;
}

export type SignalType = 'offer' | 'answer' | 'ice';

export interface CallSignalPayload {
  session_id: number;
  from_user_id: number;
  to_user_id: number | null;
  signal_type: SignalType;
  payload: Record<string, unknown>;
}

export type CallViewState =
  | 'idle'
  | 'outgoing'
  | 'incoming'
  | 'connecting'
  | 'connected'
  | 'ended'
  | 'failed';

export interface RemotePeer {
  userId: number;
  stream: MediaStream | null;
  connectionState: RTCPeerConnectionState;
  isMuted: boolean;
  isCameraOff: boolean;
}

export function callContextLabel(session: CallSession): string {
  if (session.type === 'room') return 'Room call';
  if (session.type === 'group') return 'Group call';
  return session.media === 'video' ? 'Video call' : 'Audio call';
}
