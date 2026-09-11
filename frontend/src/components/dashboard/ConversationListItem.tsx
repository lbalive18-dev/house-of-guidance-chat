import { Link } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import { FileText, Image as ImageIcon, Mic } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import type { Conversation } from '@/types/chat';

function lastMessagePreview(conversation: Conversation): { icon?: React.ReactNode; text: string } {
  const message = conversation.last_message;
  if (!message) return { text: 'Say salaam and start the conversation.' };
  if (message.is_deleted) return { text: 'This message was deleted.' };

  switch (message.type) {
    case 'system':
      return { text: message.body ?? 'Group updated' };
    case 'image':
      return { icon: <ImageIcon className="h-3.5 w-3.5" />, text: 'Photo' };
    case 'file':
    case 'pdf':
      return { icon: <FileText className="h-3.5 w-3.5" />, text: 'Document' };
    case 'voice':
      return { icon: <Mic className="h-3.5 w-3.5" />, text: 'Voice note' };
    default:
      return { text: message.body ?? '' };
  }
}

export default function ConversationListItem({ conversation }: { conversation: Conversation }) {
  const preview = lastMessagePreview(conversation);
  const name = conversation.name ?? 'Unknown';

  return (
    <Link
      to={`/chat/${conversation.id}`}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-primary-50 dark:hover:bg-primary-900/20"
    >
      <Avatar
        name={name}
        avatarUrl={conversation.avatar_url}
        size="lg"
        showOnline={conversation.type === 'private'}
        isOnline={!!conversation.is_online}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-semibold text-gray-900 dark:text-gray-50">{name}</p>
          {conversation.last_message_at && (
            <span className="shrink-0 text-xs text-gray-400">
              {formatDistanceToNowStrict(new Date(conversation.last_message_at), { addSuffix: false })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1 truncate text-sm text-gray-500 dark:text-gray-400">
            {preview.icon}
            {preview.text}
          </p>
          {conversation.unread_count > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-white">
              {conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
