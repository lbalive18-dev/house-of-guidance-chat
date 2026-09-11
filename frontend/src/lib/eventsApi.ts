import { api } from '@/lib/axios';
import type { PaginatedResponse } from '@/types/chat';
import type { EventType, HogEvent } from '@/types/hog';

export async function fetchEvents(params: { month?: number; year?: number; upcoming_only?: boolean } = {}) {
  const { data } = await api.get<PaginatedResponse<HogEvent>>('/api/events', { params });
  return data;
}

export async function fetchEvent(id: number): Promise<HogEvent> {
  const { data } = await api.get<HogEvent>(`/api/events/${id}`);
  return data;
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  location?: string;
  event_type?: EventType;
  starts_at: string;
  ends_at?: string;
  requires_registration?: boolean;
  capacity?: number;
}

export async function createEvent(payload: CreateEventPayload): Promise<HogEvent> {
  const { data } = await api.post<HogEvent>('/api/events', payload);
  return data;
}

export async function deleteEvent(id: number): Promise<void> {
  await api.delete(`/api/events/${id}`);
}

export async function registerForEvent(id: number): Promise<HogEvent> {
  const { data } = await api.post<HogEvent>(`/api/events/${id}/register`);
  return data;
}

export async function unregisterFromEvent(id: number): Promise<HogEvent> {
  const { data } = await api.delete<HogEvent>(`/api/events/${id}/register`);
  return data;
}
