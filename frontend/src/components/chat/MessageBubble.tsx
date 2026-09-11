import { useState } from 'react';
import { Check, CheckCheck, Pencil, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Avatar from '@/components/ui/Avatar';
import AttachmentView from '@/components/chat/AttachmentView';
import ReactionsBar from '@/components/chat/ReactionsBar';
import MessageActionsMenu from '@/components/chat/MessageActionsMenu';
import ReportModal from '@/components/chat/ReportModal';
import type { ChatMessage } from '@/types/chat';

interface MessageBubbleProps {
  message: ChatMessage;
  isAdmin: boolean;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onEdit: (newBody: string) => Promise<void>;
  onDelete: () => void;
  onJumpToReply?: (messageId: number) => void;
}

export default function MessageBubble({
  message,
  isAdmin,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onJumpToReply,
}: MessageBubbleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.body ?? '');
  const [saving, setSaving] = useState(false);
  const [reporting, setReporting] = useState(false);
  const isMine = message.is_mine;

  const handleCopy = () => {
    if (message.body) {
      navigator.clipboard.writeText(message.body);
      toast.success('Copied to clipboard.');
    }
  };

  const handleSaveEdit = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await onEdit(draft.trim());
      setEditing(false);
    } catch {
      toast.error('Could not save your edit.');
    } finally {
      setSaving(false);
    }
  };

  if (message.is_deleted) {
    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} px-4 py-1`}>
        <p className="rounded-2xl bg-gray-100 px-4 py-2 text-sm italic text-gray-400 dark:bg-gray-800 dark:text-gray-500">
          This message was deleted.
        </p>
      </div>
    );
  }

  return (
    <div className={`group relative flex gap-2 px-4 py-1.5 ${isMine ? 'flex-row-reverse' : ''}`}>
      {!isMine && <Avatar name={message.sender.name} avatarUrl={message.sender.avatar_url} size="sm" />}

      <div className={`relative max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
        <MessageActionsMenu
          isMine={isMine}
          isEditable={message.is_editable}
          canDelete={isMine || isAdmin}
          onReact={onReact}
          onReply={onReply}
          onEdit={message.is_editable ? () => setEditing(true) : undefined}
          onDelete={onDelete}
          onCopy={handleCopy}
          onReport={() => setReporting(true)}
        />

        {reporting && (
          <ReportModal reportableType="message" reportableId={message.id} onClose={() => setReporting(false)} />
        )}

        {message.reply_to && (
          <button
            onClick={() => onJumpToReply?.(message.reply_to!.id)}
            className={`mb-1 max-w-full truncate rounded-lg border-l-2 border-secondary-500 bg-black/5 px-2.5 py-1 text-left text-xs text-gray-600 dark:bg-white/5 dark:text-gray-300`}
          >
            <span className="font-semibold">{message.reply_to.sender_name}</span>
            {': '}
            {message.reply_to.is_deleted ? 'Deleted message' : message.reply_to.body ?? 'Attachment'}
          </button>
        )}

        <div
          className={`rounded-2xl px-4 py-2 ${
            isMine
              ? 'rounded-tr-sm bg-primary text-white'
              : 'rounded-tl-sm bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50'
          }`}
        >
          {message.attachments.map((attachment) => (
            <div key={attachment.id} className={message.body ? 'mb-2' : ''}>
              <AttachmentView attachment={attachment} type={message.type} />
            </div>
          ))}

          {editing ? (
            <div className="min-w-[16rem] space-y-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                className="w-full rounded-lg border-none bg-white/20 p-2 text-sm text-inherit placeholder:text-white/70 focus:outline-none focus:ring-1 focus:ring-white/50"
              />
              <div className="flex justify-end gap-1.5">
                <button onClick={() => setEditing(false)} className="rounded-full p-1 hover:bg-white/20" aria-label="Cancel">
                  <X className="h-4 w-4" />
                </button>
                <button onClick={handleSaveEdit} disabled={saving} className="rounded-full p-1 hover:bg-white/20" aria-label="Save">
                  <Check className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            message.body && <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
          )}
        </div>

        <ReactionsBar reactions={message.reactions} onToggle={onReact} />

        <div className={`mt-0.5 flex items-center gap-1 px-1 text-[11px] text-gray-400 ${isMine ? 'flex-row-reverse' : ''}`}>
          {message.is_edited && !editing && (
            <span className="flex items-center gap-0.5">
              <Pencil className="h-2.5 w-2.5" /> edited
            </span>
          )}
          <span>
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isMine &&
            (message.is_read_by_recipient ? (
              <CheckCheck className="h-3.5 w-3.5 text-primary-500" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            ))}
        </div>
      </div>
    </div>
  );
}
