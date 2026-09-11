import { useEffect, useRef, useState } from 'react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { Mic, Paperclip, Send, Smile, Square, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '@/context/ThemeContext';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { sendAttachmentMessage, sendTextMessage, sendTyping } from '@/lib/chatApi';
import { formatDuration } from '@/lib/format';
import ReplyPreviewBar from '@/components/chat/ReplyPreviewBar';
import type { ChatMessage, MessageType } from '@/types/chat';

function detectAttachmentType(file: File): Extract<MessageType, 'image' | 'file' | 'pdf'> {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'application/pdf') return 'pdf';
  return 'file';
}

export default function MessageComposer({
  conversationId,
  replyingTo,
  onCancelReply,
  onMessageSent,
}: {
  conversationId: number;
  replyingTo: ChatMessage | null;
  onCancelReply: () => void;
  onMessageSent: (message: ChatMessage) => void;
}) {
  const { theme } = useTheme();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recorder = useVoiceRecorder();

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const handleTextChange = (value: string) => {
    setText(value);
    sendTyping(conversationId, true).catch(() => undefined);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(conversationId, false).catch(() => undefined);
    }, 2000);
  };

  const handleSendText = async () => {
    const body = text.trim();
    if (!body || sending) return;

    setSending(true);
    setText('');
    sendTyping(conversationId, false).catch(() => undefined);

    try {
      const message = await sendTextMessage(conversationId, {
        body,
        reply_to_id: replyingTo?.id,
      });
      onMessageSent(message);
      onCancelReply();
    } catch {
      toast.error('Could not send your message.');
      setText(body);
    } finally {
      setSending(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Files must be under 20MB.');
      return;
    }

    setSending(true);
    try {
      const message = await sendAttachmentMessage(conversationId, {
        file,
        fileName: file.name,
        attachmentType: detectAttachmentType(file),
        replyToId: replyingTo?.id,
      });
      onMessageSent(message);
      onCancelReply();
    } catch {
      toast.error('Could not send that file.');
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleStartRecording = async () => {
    try {
      await recorder.start();
    } catch {
      toast.error('Microphone access is required to record a voice note.');
    }
  };

  const handleStopAndSendRecording = async () => {
    const result = await recorder.stop();
    if (!result || result.seconds < 1) return;

    setSending(true);
    try {
      const message = await sendAttachmentMessage(conversationId, {
        file: result.blob,
        fileName: 'voice-note.webm',
        attachmentType: 'voice',
        durationSeconds: result.seconds,
        replyToId: replyingTo?.id,
      });
      onMessageSent(message);
      onCancelReply();
    } catch {
      toast.error('Could not send the voice note.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-gray-100 bg-white dark:border-gray-800 dark:bg-surface-dark">
      {replyingTo && <ReplyPreviewBar message={replyingTo} onCancel={onCancelReply} />}

      {recorder.isRecording ? (
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
          <span className="flex-1 text-sm text-gray-600 dark:text-gray-300">
            Recording… {formatDuration(recorder.seconds)}
          </span>
          <button
            onClick={recorder.cancel}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Cancel recording"
          >
            <Trash2 className="h-5 w-5" />
          </button>
          <button
            onClick={handleStopAndSendRecording}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white"
            aria-label="Send recording"
          >
            <Square className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative flex items-end gap-1.5 px-3 py-2.5">
          {showEmoji && (
            <div className="absolute bottom-full left-2 mb-2 z-30">
              <EmojiPicker
                theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
                onEmojiClick={(emojiData) => setText((t) => t + emojiData.emoji)}
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowEmoji((v) => !v)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-800"
            aria-label="Emoji picker"
          >
            <Smile className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-800"
            aria-label="Attach file"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,application/pdf,.doc,.docx,.txt"
            onChange={handleFileSelected}
          />

          <textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendText();
              }
            }}
            placeholder="Type a message…"
            rows={1}
            className="max-h-32 flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />

          {text.trim() ? (
            <button
              type="button"
              onClick={handleSendText}
              disabled={sending}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-60"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartRecording}
              disabled={sending}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-primary disabled:opacity-60 dark:hover:bg-gray-800"
              aria-label="Record voice note"
            >
              <Mic className="h-5 w-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
