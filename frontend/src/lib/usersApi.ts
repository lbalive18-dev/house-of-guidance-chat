import { api } from '@/lib/axios';
import type { User } from '@/types/auth';

export async function searchUsers(query: string): Promise<User[]> {
  if (!query.trim()) return [];
  const { data } = await api.get<User[]>('/api/users/search', { params: { q: query } });
  return data;
}
