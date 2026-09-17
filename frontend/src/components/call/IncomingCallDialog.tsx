import { Phone, PhoneOff, Video } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { callContextLabel, type CallSession } from '@/types/call';

interface IncomingCallDialogProps {
  session: CallSession;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallDialog({ session, onAccept, onDecline }: IncomingCallDialogProps) {
  const caller = session.initiator;
  const isVideo = session.media === 'video';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Incoming call">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl dark:bg-slate-900">
        <div className="mx-auto mb-4 flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          {isVideo ? <Video className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
        </div>

        {caller && (
          <div className="mb-3 flex justify-center">
            <Avatar name={caller.name} avatarUrl={caller.avatar_url} />
          </div>
        )}

        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">
          {caller?.name ?? 'Someone'} is calling
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {isVideo ? 'Video' : 'Audio'} • {callContextLabel(session)}
        </p>

        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={onDecline}
            aria-label="Decline call"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={onAccept}
            aria-label="Accept call"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Phone className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
