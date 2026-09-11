import { useState } from 'react';
import { Copy, Flag, Pencil, Reply, SmilePlus, Trash2 } from 'lucide-react';

const QUICK_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🤲'];

export default function MessageActionsMenu({
  isMine,
  isEditable,
  canDelete,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onCopy,
  onReport,
}: {
  isMine: boolean;
  isEditable: boolean;
  canDelete: boolean;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCopy: () => void;
  onReport?: () => void;
}) {
  const [showEmojis, setShowEmojis] = useState(false);

  return (
    <div
      className={`absolute top-0 z-10 flex -translate-y-1/2 items-center gap-0.5 rounded-full border border-gray-100 bg-white p-1 opacity-0 shadow-card transition-opacity group-hover:opacity-100 dark:border-gray-800 dark:bg-gray-900 ${
        isMine ? 'right-2' : 'left-2'
      }`}
    >
      {showEmojis ? (
        QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onReact(emoji);
              setShowEmojis(false);
            }}
            className="rounded-full p-1 text-base hover:bg-primary-50 dark:hover:bg-primary-900/30"
          >
            {emoji}
          </button>
        ))
      ) : (
        <>
          <button
            onClick={() => setShowEmojis(true)}
            className="rounded-full p-1.5 text-gray-500 hover:bg-primary-50 hover:text-primary dark:text-gray-400 dark:hover:bg-primary-900/30"
            aria-label="React"
          >
            <SmilePlus className="h-4 w-4" />
          </button>
          <button
            onClick={onReply}
            className="rounded-full p-1.5 text-gray-500 hover:bg-primary-50 hover:text-primary dark:text-gray-400 dark:hover:bg-primary-900/30"
            aria-label="Reply"
          >
            <Reply className="h-4 w-4" />
          </button>
          <button
            onClick={onCopy}
            className="rounded-full p-1.5 text-gray-500 hover:bg-primary-50 hover:text-primary dark:text-gray-400 dark:hover:bg-primary-900/30"
            aria-label="Copy"
          >
            <Copy className="h-4 w-4" />
          </button>
          {isEditable && onEdit && (
            <button
              onClick={onEdit}
              className="rounded-full p-1.5 text-gray-500 hover:bg-primary-50 hover:text-primary dark:text-gray-400 dark:hover:bg-primary-900/30"
              aria-label="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {canDelete && onDelete && (
            <button
              onClick={onDelete}
              className="rounded-full p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-950/30"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {!isMine && onReport && (
            <button
              onClick={onReport}
              className="rounded-full p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-950/30"
              aria-label="Report"
            >
              <Flag className="h-4 w-4" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
