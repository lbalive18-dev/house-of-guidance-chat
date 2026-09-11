import { api } from '@/lib/axios';
import type { Conversation } from '@/types/chat';

export interface CreateGroupPayload {
  name: string;
  description?: string;
  member_ids: number[];
  avatar?: File;
}

export async function createGroup(payload: CreateGroupPayload): Promise<Conversation> {
  const formData = new FormData();
  formData.append('name', payload.name);
  if (payload.description) formData.append('description', payload.description);
  payload.member_ids.forEach((id) => formData.append('member_ids[]', String(id)));
  if (payload.avatar) formData.append('avatar', payload.avatar);

  const { data } = await api.post<Conversation>('/api/conversations/group', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export interface UpdateGroupPayload {
  name?: string;
  description?: string;
  avatar?: File;
}

export async function updateGroup(
  conversationId: number,
  payload: UpdateGroupPayload
): Promise<Conversation> {
  const formData = new FormData();
  formData.append('_method', 'PUT');
  if (payload.name) formData.append('name', payload.name);
  if (payload.description !== undefined) formData.append('description', payload.description);
  if (payload.avatar) formData.append('avatar', payload.avatar);

  const { data } = await api.post<Conversation>(`/api/conversations/${conversationId}/group`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function addGroupMembers(conversationId: number, memberIds: number[]): Promise<Conversation> {
  const { data } = await api.post<Conversation>(`/api/conversations/${conversationId}/members`, {
    member_ids: memberIds,
  });
  return data;
}

export async function removeGroupMember(conversationId: number, userId: number): Promise<void> {
  await api.delete(`/api/conversations/${conversationId}/members/${userId}`);
}

export async function updateGroupMemberRole(
  conversationId: number,
  userId: number,
  role: 'member' | 'admin'
): Promise<Conversation> {
  const { data } = await api.put<Conversation>(`/api/conversations/${conversationId}/members/${userId}/role`, {
    role,
  });
  return data;
}
