import { api } from '@/lib/axios';
import type { PaginatedResponse } from '@/types/chat';
import type { User, UserRole } from '@/types/auth';
import type { AnalyticsOverview, Report } from '@/types/admin';

export async function fetchAdminUsers(params: { q?: string; role?: UserRole; banned_only?: boolean; page?: number } = {}) {
  const { data } = await api.get<PaginatedResponse<User>>('/api/admin/users', { params });
  return data;
}

export async function updateUserRole(userId: number, role: UserRole): Promise<User> {
  const { data } = await api.put<User>(`/api/admin/users/${userId}/role`, { role });
  return data;
}

export async function banUser(userId: number, reason: string): Promise<User> {
  const { data } = await api.post<User>(`/api/admin/users/${userId}/ban`, { reason });
  return data;
}

export async function unbanUser(userId: number): Promise<User> {
  const { data } = await api.post<User>(`/api/admin/users/${userId}/unban`);
  return data;
}

export async function fetchReports(status?: string) {
  const { data } = await api.get<PaginatedResponse<Report>>('/api/admin/reports', {
    params: { status },
  });
  return data;
}

export async function resolveReport(
  reportId: number,
  status: 'resolved' | 'dismissed',
  deleteContent = false
): Promise<Report> {
  const { data } = await api.put<Report>(`/api/admin/reports/${reportId}`, {
    status,
    delete_content: deleteContent,
  });
  return data;
}

export interface BroadcastPayload {
  title: string;
  body: string;
  audience?: 'all' | 'students' | 'teachers' | 'admins';
}

export async function sendBroadcast(payload: BroadcastPayload): Promise<{ message: string; recipient_count: number }> {
  const { data } = await api.post('/api/admin/broadcast', payload);
  return data;
}

export async function fetchAnalytics(): Promise<AnalyticsOverview> {
  const { data } = await api.get<AnalyticsOverview>('/api/admin/analytics');
  return data;
}
