import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import Avatar from '@/components/ui/Avatar';
import MessageBubble from '@/components/chat/MessageBubble';
import MessageComposer from '@/components/chat/MessageComposer';
import TypingIndicator from '@/components/chat/TypingIndicator';
import GroupInfoPanel from '@/components/chat/GroupInfoPanel';
import { useAuthStore } from '@/store/authStore';
import { useConversationChannel } from '@/hooks/useConversationChannel';
import { api } from '@/lib/axios';
import {
  deleteMessage,
  editMessage,
  fetchConversation,
  fetchMessages,
  markConversationRead,
} from '@/lib/chatApi';
import type { ChatMessage, Conversation } from '@/types/chat';

export default function Chat() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const id = Number(conversationId);
  const currentUser = useAuthStore((s) => s.user);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingClearTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([fetchConversation(id), fetchMessages(id, 1)]).then(([conv, msgs]) => {
      setConversation(conv);
      setMessages([...msgs.data].reverse());
      setHasMore(msgs.meta.current_page < msgs.meta.last_page);
      setPage(1);
      setLoading(false);
      markConversationRead(id).catch(() => undefined);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView());
    });
  }, [id]);

  const loadOlderMessages = useCallback(async () => {
    if (!hasMore) return;
    const container = scrollRef.current;
    const previousHeight = container?.scrollHeight ?? 0;

    const nextPage = page + 1;
    const res = await fetchMessages(id, nextPage);
    setMessages((prev) => [...[...res.data].reverse(), ...prev]);
    setHasMore(res.meta.current_page < res.meta.last_page);
    setPage(nextPage);

    requestAnimationFrame(() => {
      if (container) {
        container.scrollTop = container.scrollHeight - previousHeight;
      }
    });
  }, [hasMore, id, page]);

  const handleScroll = () => {
    if (scrollRef.current && scrollRef.current.scrollTop < 80) {
      loadOlderMessages();
    }
  };

  const appendOrReplace = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      const exists = prev.some((m) => m.id === message.id);
      if (exists) return prev.map((m) => (m.id === message.id ? message : m));
      return [...prev, message];
    });
  }, []);

  /**
   * `is_mine` / `is_editable` are resolved server-side against the request
   * of whoever triggered the broadcast (the sender/editor) - since these
   * events are sent with toOthers(), every actual recipient is NOT that
   * person, so those flags always arrive wrong and must be recomputed here.
   */
  const normalizeIncoming = useCallback(
    (message: ChatMessage): ChatMessage => {
      const isMine = message.sender.id === currentUser?.id;
      const ageMinutes = (Date.now() - new Date(message.created_at).getTime()) / 60000;
      return {
        ...message,
        is_mine: isMine,
        is_editable: isMine && message.type === 'text' && !message.is_deleted && ageMinutes < 15,
      };
    },
    [currentUser?.id]
  );

  useConversationChannel(id, {
    onMessageSent: (message) => {
      appendOrReplace(normalizeIncoming(message));
      markConversationRead(id).catch(() => undefined);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
    },
    onMessageUpdated: (message) => appendOrReplace(normalizeIncoming(message)),
    onMessageDeleted: ({ message_id }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === message_id ? { ...m, is_deleted: true, body: null } : m))
      );
    },
    onReactionUpdated: ({ message_id, reactions }) => {
      const grouped = Object.values(
        reactions.reduce<Record<string, { emoji: string; count: number; reacted_by_me: boolean; user_names: string[] }>>(
          (acc, r) => {
            acc[r.emoji] ??= { emoji: r.emoji, count: 0, reacted_by_me: false, user_names: [] };
            acc[r.emoji].count += 1;
            acc[r.emoji].user_names.push(r.user_name);
            if (r.user_id === currentUser?.id) acc[r.emoji].reacted_by_me = true;
            return acc;
          },
          {}
        )
      );
      setMessages((prev) => prev.map((m) => (m.id === message_id ? { ...m, reactions: grouped } : m)));
    },
    onTyping: (payload) => {
      if (payload.user_id === currentUser?.id) return;
      if (typingClearTimeout.current) clearTimeout(typingClearTimeout.current);

      if (payload.is_typing) {
        setTypingUser(payload.name);
        typingClearTimeout.current = setTimeout(() => setTypingUser(null), 3000);
      } else {
        setTypingUser(null);
      }
    },
    onConversationRead: (payload) => {
      if (payload.reader_id === currentUser?.id) return;
      const readAt = new Date(payload.read_at);
      setMessages((prev) =>
        prev.map((m) =>
          m.is_mine && new Date(m.created_at) <= readAt ? { ...m, is_read_by_recipient: true } : m
        )
      );
    },
    onConversationUpdated: (payload) => {
      setConversation((prev) =>
        prev
          ? {
              ...prev,
              name: payload.name,
              description: payload.description,
              avatar_url: payload.avatar_url,
              participant_count: payload.participant_count,
              members: payload.members,
            }
          : prev
      );
    },
  });

  const handleMessageSent = (message: ChatMessage) => {
    appendOrReplace(message);
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
  };

  const handleReact = async (message: ChatMessage, emoji: string) => {
    try {
      const { data } = await api.post(`/api/conversations/${id}/messages/${message.id}/react`, { emoji });
      setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, reactions: data.reactions } : m)));
    } catch {
      toast.error('Could not react to that message.');
    }
  };

  const handleEdit = async (message: ChatMessage, newBody: string) => {
    const updated = await editMessage(id, message.id, newBody);
    appendOrReplace(updated);
  };

  const handleDelete = async (message: ChatMessage) => {
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, is_deleted: true, body: null } : m)));
    try {
      await deleteMessage(id, message.id);
    } catch {
      toast.error('Could not delete that message.');
    }
  };

  if (!id) return null;

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-surface-dark">
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <Link to="/" className="rounded-full p-1.5 text-gray-500 hover:bg-primary-50 dark:hover:bg-primary-900/30">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {conversation && (
          <button
            type="button"
            onClick={() => conversation.type === 'group' && setShowGroupInfo(true)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <Avatar
              name={conversation.name ?? ''}
              avatarUrl={conversation.avatar_url}
              showOnline={conversation.type === 'private'}
              isOnline={!!conversation.is_online}
            />
            <div className="min-w-0">
              <p className="truncate font-semibold text-gray-900 dark:text-gray-50">{conversation.name}</p>
              {conversation.type === 'private' ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {typingUser ? 'typing…' : conversation.is_online ? 'Online' : 'Offline'}
                </p>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {typingUser ? 'typing…' : `${conversation.participant_count} members`}
                </p>
              )}
            </div>
          </button>
        )}
        {conversation?.type === 'group' && (
          <button
            onClick={() => setShowGroupInfo(true)}
            className="rounded-full p-1.5 text-gray-400 hover:bg-primary-50 hover:text-primary dark:hover:bg-primary-900/30"
            aria-label="Group info"
          >
            <Info className="h-5 w-5" />
          </button>
        )}
      </div>

      {showGroupInfo && conversation?.type === 'group' && (
        <GroupInfoPanel
          conversation={conversation}
          onClose={() => setShowGroupInfo(false)}
          onUpdated={(updated) => setConversation(updated)}
        />
      )}

      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto py-3">
        {loading && (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!loading &&
          messages.map((message) =>
            message.type === 'system' ? (
              <div key={message.id} className="flex justify-center px-4 py-1.5">
                <span className="rounded-full bg-gray-100 px-3 py-1 text-center text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  {message.body}
                </span>
              </div>
            ) : (
              <MessageBubble
                key={message.id}
                message={message}
                isAdmin={currentUser?.role === 'admin'}
                onReact={(emoji) => handleReact(message, emoji)}
                onReply={() => setReplyingTo(message)}
                onEdit={(body) => handleEdit(message, body)}
                onDelete={() => handleDelete(message)}
              />
            )
          )}

        {typingUser && <TypingIndicator name={typingUser} />}
        <div ref={bottomRef} />
      </div>

      <MessageComposer
        conversationId={id}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        onMessageSent={handleMessageSent}
      />
    </div>
  );
}
