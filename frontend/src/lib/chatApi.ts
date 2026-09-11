import { api } from '@/lib/axios';
import type { ChatMessage, Conversation, MessageType, PaginatedResponse } from '@/types/chat';

export async function fetchConversations(page = 1): Promise<PaginatedResponse<Conversation>> {
  const { data } = await api.get<PaginatedResponse<Conversation>>('/api/conversations', {
    params: { page },
  });
  return data;
}

export async function fetchConversation(id: number): Promise<Conversation> {
  const { data } = await api.get<Conversation>(`/api/conversations/${id}`);
  return data;
}

export async function startConversation(userId: number): Promise<Conversation> {
  const { data } = await api.post<Conversation>('/api/conversations/start', { user_id: userId });
  return data;
}

export async function markConversationRead(conversationId: number): Promise<void> {
  await api.post(`/api/conversations/${conversationId}/read`);
}

export async function sendTyping(conversationId: number, isTyping: boolean): Promise<void> {
  await api.post(`/api/conversations/${conversationId}/typing`, { is_typing: isTyping });
}

export async function fetchMessages(
  conversationId: number,
  page = 1
): Promise<PaginatedResponse<ChatMessage>> {
  const { data } = await api.get<PaginatedResponse<ChatMessage>>(
    `/api/conversations/${conversationId}/messages`,
    { params: { page } }
  );
  return data;
}

export interface SendTextMessagePayload {
  body: string;
  reply_to_id?: number;
}

export async function sendTextMessage(
  conversationId: number,
  payload: SendTextMessagePayload
): Promise<ChatMessage> {
  const { data } = await api.post<ChatMessage>(
    `/api/conversations/${conversationId}/messages`,
    payload
  );
  return data;
}

export interface SendAttachmentPayload {
  file: File | Blob;
  fileName?: string;
  attachmentType: Extract<MessageType, 'image' | 'file' | 'pdf' | 'voice'>;
  body?: string;
  replyToId?: number;
  durationSeconds?: number;
}

export async function sendAttachmentMessage(
  conversationId: number,
  payload: SendAttachmentPayload
): Promise<ChatMessage> {
  const formData = new FormData();
  formData.append('attachment', payload.file, payload.fileName);
  formData.append('attachment_type', payload.attachmentType);
  if (payload.body) formData.append('body', payload.body);
  if (payload.replyToId) formData.append('reply_to_id', String(payload.replyToId));
  if (payload.durationSeconds) formData.append('duration_seconds', String(payload.durationSeconds));

  const { data } = await api.post<ChatMessage>(
    `/api/conversations/${conversationId}/messages`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

export async function editMessage(
  conversationId: number,
  messageId: number,
  body: string
): Promise<ChatMessage> {
  const { data } = await api.put<ChatMessage>(
    `/api/conversations/${conversationId}/messages/${messageId}`,
    { body }
  );
  return data;
}

export async function deleteMessage(conversationId: number, messageId: number): Promise<void> {
  await api.delete(`/api/conversations/${conversationId}/messages/${messageId}`);
}

export async function reactToMessage(
  conversationId: number,
  messageId: number,
  emoji: string
): Promise<void> {
  await api.post(`/api/conversations/${conversationId}/messages/${messageId}/react`, { emoji });
}
