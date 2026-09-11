import { useEffect, useRef } from 'react';
import { getEcho } from '@/lib/echo';
import type { ChatMessage } from '@/types/chat';

interface TypingPayload {
  user_id: number;
  name: string;
  is_typing: boolean;
}

interface RawReaction {
  emoji: string;
  user_id: number;
  user_name: string;
}

interface ReactionUpdatedPayload {
  message_id: number;
  reactions: RawReaction[];
}

interface ConversationReadPayload {
  conversation_id: number;
  reader_id: number;
  read_at: string;
}

interface GroupMemberSnapshot {
  id: number;
  name: string;
  avatar_url: string | null;
  is_online: boolean;
  role: 'member' | 'admin';
}

interface ConversationUpdatedPayload {
  conversation_id: number;
  name: string | null;
  description: string | null;
  avatar_url: string | null;
  participant_count: number;
  members: GroupMemberSnapshot[];
}

interface ConversationChannelHandlers {
  onMessageSent?: (message: ChatMessage) => void;
  onMessageUpdated?: (message: ChatMessage) => void;
  onMessageDeleted?: (payload: { message_id: number }) => void;
  onReactionUpdated?: (payload: ReactionUpdatedPayload) => void;
  onTyping?: (payload: TypingPayload) => void;
  onConversationRead?: (payload: ConversationReadPayload) => void;
  onConversationUpdated?: (payload: ConversationUpdatedPayload) => void;
}

export function useConversationChannel(
  conversationId: number | undefined,
  handlers: ConversationChannelHandlers
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!conversationId) return;

    const echo = getEcho();
    const channel = echo.private(`conversation.${conversationId}`);

    channel
      .listen('.message.sent', (payload: { message: ChatMessage }) => {
        handlersRef.current.onMessageSent?.(payload.message);
      })
      .listen('.message.updated', (payload: { message: ChatMessage }) => {
        handlersRef.current.onMessageUpdated?.(payload.message);
      })
      .listen('.message.deleted', (payload: { message_id: number }) => {
        handlersRef.current.onMessageDeleted?.(payload);
      })
      .listen('.message.reaction.updated', (payload: ReactionUpdatedPayload) => {
        handlersRef.current.onReactionUpdated?.(payload);
      })
      .listen('.user.typing', (payload: TypingPayload) => {
        handlersRef.current.onTyping?.(payload);
      })
      .listen('.conversation.read', (payload: ConversationReadPayload) => {
        handlersRef.current.onConversationRead?.(payload);
      })
      .listen('.conversation.updated', (payload: ConversationUpdatedPayload) => {
        handlersRef.current.onConversationUpdated?.(payload);
      });

    return () => {
      echo.leave(`conversation.${conversationId}`);
    };
  }, [conversationId]);
}
