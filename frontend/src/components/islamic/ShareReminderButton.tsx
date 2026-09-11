import { useEffect, useRef, useState } from 'react';
import { Check, Copy, MessageCircle, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchConversations, sendTextMessage } from '@/lib/chatApi';
import type { Conversation } from '@/types/chat';

export default function ShareReminderButton({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPicking(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNativeShare = async () => {
    setOpen(false);
    if (navigator.share) {
      try {
        await navigator.share({ text, title: 'House of Guidance Chat' });
      } catch {
        // user cancelled - no-op
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard.');
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard.');
    setOpen(false);
  };

  const openPicker = () => {
    setPicking(true);
    fetchConversations().then((res) => setConversations(res.data));
  };

  const handleSendToConversation = async (conversation: Conversation) => {
    try {
      await sendTextMessage(conversation.id, { body: text });
      toast.success(`Sent to ${conversation.name}.`);
      setOpen(false);
      setPicking(false);
    } catch {
      toast.error('Could not send that reminder.');
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-50 dark:border-primary-300/30 dark:text-primary-300 dark:hover:bg-primary-900/30"
      >
        <Share2 className="h-3.5 w-3.5" />
        Share Reminder
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white py-1.5 shadow-card dark:border-gray-800 dark:bg-gray-900">
          {!picking ? (
            <>
              <button
                onClick={handleNativeShare}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-gray-700 hover:bg-primary-50 dark:text-gray-200 dark:hover:bg-primary-900/30"
              >
                <Share2 className="h-4 w-4" /> Share via device
              </button>
              <button
                onClick={handleCopy}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-gray-700 hover:bg-primary-50 dark:text-gray-200 dark:hover:bg-primary-900/30"
              >
                <Copy className="h-4 w-4" /> Copy text
              </button>
              <button
                onClick={openPicker}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-gray-700 hover:bg-primary-50 dark:text-gray-200 dark:hover:bg-primary-900/30"
              >
                <MessageCircle className="h-4 w-4" /> Send to a chat
              </button>
            </>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {conversations.length === 0 && (
                <p className="px-3.5 py-3 text-xs text-gray-400">No conversations yet.</p>
              )}
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => handleSendToConversation(conversation)}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-gray-700 hover:bg-primary-50 dark:text-gray-200 dark:hover:bg-primary-900/30"
                >
                  <Check className="h-3.5 w-3.5 shrink-0 opacity-0" />
                  <span className="truncate">{conversation.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
