import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { fetchConversations } from '@/lib/chatApi';
import ConversationListItem from '@/components/dashboard/ConversationListItem';
import type { Conversation } from '@/types/chat';

export default function ConversationList() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations()
      .then((res) => setConversations(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <div className="h-14 w-14 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-1/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-200 px-6 py-12 text-center dark:border-gray-800">
        <MessageCircle className="h-8 w-8 text-gray-300 dark:text-gray-600" />
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No conversations yet</p>
        <p className="text-xs text-gray-400">Search for someone above to start chatting.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {conversations.map((conversation) => (
        <ConversationListItem key={conversation.id} conversation={conversation} />
      ))}
    </div>
  );
}
