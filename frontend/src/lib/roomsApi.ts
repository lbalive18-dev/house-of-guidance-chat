import { api } from '@/lib/axios';
import type { Conversation } from '@/types/chat';

export async function fetchRooms(): Promise<Conversation[]> {
  const { data } = await api.get<Conversation[]>('/api/rooms');
  return data;
}

export async function joinRoom(conversationId: number): Promise<Conversation> {
  const { data } = await api.post<Conversation>(`/api/rooms/${conversationId}/join`);
  return data;
}
