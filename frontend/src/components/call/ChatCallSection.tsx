import { Phone, Video } from 'lucide-react';
import { useCall } from '@/hooks/useCall';
import { removeCallParticipant } from '@/lib/callApi';
import ActiveCallView from '@/components/call/ActiveCallView';
import GroupCallView from '@/components/call/GroupCallView';
import IncomingCallDialog from '@/components/call/IncomingCallDialog';
import type { Conversation } from '@/types/chat';
import type { User } from '@/types/auth';

interface ChatCallSectionProps {
  conversation: Conversation;
  currentUser: User;
}

/** Voice/video calling for direct (private/group) conversations. */
export default function ChatCallSection({ conversation, currentUser }: ChatCallSectionProps) {
  const call = useCall({ conversationId: conversation.id, currentUserId: currentUser.id });
  const isGroup = conversation.type === 'group';
  const isAdmin = conversation.my_role === 'admin';

  if (call.viewState === 'idle') {
    return (
      <div className="flex items-center justify-center gap-2 border-b border-gray-100 px-4 py-2 dark:border-gray-800">
        <button
          type="button"
          onClick={() => void call.begin('audio')}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3.5 py-1.5 text-xs font-bold text-primary hover:bg-primary-100 dark:bg-primary-900/40 dark:text-primary-300"
        >
          <Phone className="h-3.5 w-3.5" /> Audio call
        </button>
        <button
          type="button"
          onClick={() => void call.begin('video')}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3.5 py-1.5 text-xs font-bold text-primary hover:bg-primary-100 dark:bg-primary-900/40 dark:text-primary-300"
        >
          <Video className="h-3.5 w-3.5" /> Video call
        </button>
      </div>
    );
  }

  if (call.viewState === 'incoming' && call.session) {
    return (
      <IncomingCallDialog
        session={call.session}
        onAccept={() => void call.accept()}
        onDecline={() => void call.decline()}
      />
    );
  }

  return (
    <div className="border-b border-gray-100 px-4 dark:border-gray-800">
      {isGroup ? (
        <GroupCallView
          call={call}
          currentUserName={currentUser.name}
          currentUserAvatar={currentUser.avatar_url}
          isAdmin={isAdmin}
          onRemoveParticipant={(userId) => {
            if (!call.session) return;
            void removeCallParticipant(call.session.id, userId)
              .then(() => call.refreshSession(call.session!.id))
              .catch(() => undefined);
          }}
        />
      ) : (
        <ActiveCallView
          call={call}
          currentUserId={currentUser.id}
          currentUserName={currentUser.name}
          currentUserAvatar={currentUser.avatar_url}
        />
      )}
    </div>
  );
}
