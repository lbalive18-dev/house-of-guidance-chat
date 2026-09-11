import { api } from '@/lib/axios';
import type { AppNotification } from '@/types/notification';
import type { PaginatedResponse } from '@/types/chat';

export async function fetchNotifications(page = 1): Promise<PaginatedResponse<AppNotification>> {
  const { data } = await api.get<PaginatedResponse<AppNotification>>('/api/notifications', {
    params: { page },
  });
  return data;
}

export async function fetchUnreadCount(): Promise<number> {
  const { data } = await api.get<{ unread_count: number }>('/api/notifications/unread-count');
  return data.unread_count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.post(`/api/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/api/notifications/read-all');
}
