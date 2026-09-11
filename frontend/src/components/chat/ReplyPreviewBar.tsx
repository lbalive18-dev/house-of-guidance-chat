import { X } from 'lucide-react';
import type { ChatMessage } from '@/types/chat';

export default function ReplyPreviewBar({
  message,
  onCancel,
}: {
  message: ChatMessage;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
      <div className="min-w-0 border-l-2 border-secondary-500 pl-2.5">
        <p className="text-xs font-semibold text-primary">Replying to {message.sender.name}</p>
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
          {message.body ?? 'Attachment'}
        </p>
      </div>
      <button
        onClick={onCancel}
        className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
        aria-label="Cancel reply"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
