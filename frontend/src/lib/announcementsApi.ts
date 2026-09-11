import { api } from '@/lib/axios';
import type { PaginatedResponse } from '@/types/chat';
import type { Announcement } from '@/types/hog';

export async function fetchAnnouncements(page = 1): Promise<PaginatedResponse<Announcement>> {
  const { data } = await api.get<PaginatedResponse<Announcement>>('/api/announcements', {
    params: { page },
  });
  return data;
}

export interface CreateAnnouncementPayload {
  title: string;
  body: string;
  audience?: 'all' | 'students' | 'teachers';
  pinned?: boolean;
}

export async function createAnnouncement(payload: CreateAnnouncementPayload): Promise<Announcement> {
  const { data } = await api.post<Announcement>('/api/announcements', payload);
  return data;
}

export async function deleteAnnouncement(id: number): Promise<void> {
  await api.delete(`/api/announcements/${id}`);
}
