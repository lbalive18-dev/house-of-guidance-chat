import { api } from '@/lib/axios';
import type { CallMedia, CallSession, RoomCallState } from '@/types/call';

export async function fetchIceServers(): Promise<RTCConfiguration> {
  const { data } = await api.get<{ ice_servers: RTCIceServer[] }>('/api/calls/ice-servers');
  return { iceServers: data.ice_servers };
}

export async function startCall(conversationId: number, media: CallMedia): Promise<CallSession> {
  const { data } = await api.post<CallSession>('/api/calls/start', {
    conversation_id: conversationId,
    media,
  });
  return data;
}

export async function fetchActiveCall(conversationId: number): Promise<CallSession | null> {
  const { data } = await api.get<{ session: CallSession | null }>(
    `/api/calls/active/${conversationId}`,
  );
  return data.session;
}

export async function fetchCall(sessionId: number): Promise<CallSession> {
  const { data } = await api.get<CallSession>(`/api/calls/${sessionId}`);
  return data;
}

export async function acceptCall(sessionId: number): Promise<CallSession> {
  const { data } = await api.post<CallSession>(`/api/calls/${sessionId}/accept`);
  return data;
}

export async function declineCall(sessionId: number): Promise<void> {
  await api.post(`/api/calls/${sessionId}/decline`);
}

export async function cancelCall(sessionId: number): Promise<void> {
  await api.post(`/api/calls/${sessionId}/cancel`);
}

export async function endCall(sessionId: number): Promise<void> {
  await api.post(`/api/calls/${sessionId}/end`);
}

export async function joinCall(sessionId: number): Promise<CallSession> {
  const { data } = await api.post<CallSession>(`/api/calls/${sessionId}/join`);
  return data;
}

export async function leaveCall(sessionId: number): Promise<void> {
  await api.post(`/api/calls/${sessionId}/leave`);
}

/**
 * Best-effort leave on page unload. Uses keepalive + the XSRF cookie
 * directly because sendBeacon cannot set custom headers (Sanctum would
 * answer 419). The server-side heartbeat pruner is the backstop.
 */
export function leaveCallBeacon(sessionId: number): void {
  try {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    if (!match) return;
    void fetch(`/api/calls/${sessionId}/leave`, {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: {
        Accept: 'application/json',
        'X-XSRF-TOKEN': decodeURIComponent(match[1]),
      },
    });
  } catch {
    // unload path — nothing sensible to do on failure
  }
}

export async function sendHeartbeat(sessionId: number): Promise<void> {
  await api.post(`/api/calls/${sessionId}/heartbeat`);
}

export async function updateMediaState(
  sessionId: number,
  state: { is_muted?: boolean; is_camera_off?: boolean },
): Promise<void> {
  await api.put(`/api/calls/${sessionId}/media`, state);
}

export async function sendSignal(
  sessionId: number,
  signal: { to_user_id?: number | null; signal_type: 'offer' | 'answer' | 'ice'; payload: Record<string, unknown> },
): Promise<void> {
  await api.post(`/api/calls/${sessionId}/signal`, signal);
}

export async function removeCallParticipant(sessionId: number, userId: number): Promise<void> {
  await api.delete(`/api/calls/${sessionId}/participants/${userId}`);
}

export async function fetchRoomCallState(conversationId: number): Promise<RoomCallState> {
  const { data } = await api.get<RoomCallState>(`/api/rooms/${conversationId}/seats`);
  return data;
}

export async function claimSeat(conversationId: number, seatNumber: number): Promise<void> {
  await api.post(`/api/rooms/${conversationId}/seats/claim`, { seat_number: seatNumber });
}

export async function releaseSeat(conversationId: number, seatNumber: number): Promise<void> {
  await api.delete(`/api/rooms/${conversationId}/seats/${seatNumber}`);
}

export async function updateSeatCapacity(conversationId: number, seatCapacity: number): Promise<void> {
  await api.put(`/api/rooms/${conversationId}/seat-capacity`, { seat_capacity: seatCapacity });
}
