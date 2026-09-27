import { Phone, PhoneOff, Video } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { useRingtone } from '@/hooks/useRingtone';
import { callContextLabel, type CallSession } from '@/types/call';

interface IncomingCallDialogProps {
  session: CallSession;
  onAccept: () => void;
  onDecline: () => void;
  isAccepting?: boolean;
}

export default function IncomingCallDialog({ session, onAccept, onDecline, isAccepting = false }: IncomingCallDialogProps) {
  const caller = session.initiator;
  const isVideo = session.media === 'video';
  useRingtone(true, 'incoming');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#021711]/95 p-5 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label="Incoming call">
      <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-[#d4af37]/35 bg-gradient-to-b from-[#0a3024] to-[#041d16] px-7 py-9 text-center text-white shadow-[0_28px_90px_rgba(0,0,0,.45)] animate-page-enter">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />
        <p className="relative mb-6 text-xs font-semibold uppercase tracking-[0.24em] text-[#e6ca74]">House of Guidance</p>
        <div className="relative mx-auto mb-5 flex h-16 w-16 animate-call-ring items-center justify-center rounded-full border border-[#d4af37]/50 bg-[#d4af37]/15 text-[#f3d877]">
          {isVideo ? <Video className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
        </div>

        {caller && (
          <div className="relative mb-4 flex justify-center">
            <Avatar name={caller.name} avatarUrl={caller.avatar_url} size="xl" />
          </div>
        )}

        <h2 className="relative text-2xl font-semibold tracking-tight">
          {caller?.name ?? 'Someone'} is calling
        </h2>
        <p className="relative mt-2 text-sm text-emerald-100/75">
          {isVideo ? 'Video' : 'Audio'} • {callContextLabel(session)}
        </p>

        <div className="relative mt-9 flex items-center justify-center gap-8">
          <button
            type="button"
            onClick={onDecline}
            aria-label="Decline call"
            disabled={isAccepting}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-[#d9473f] text-white shadow-lg transition hover:scale-105 hover:bg-[#c83b34] disabled:opacity-50"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={onAccept}
            aria-label="Accept call"
            disabled={isAccepting}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1f9a68] text-white shadow-lg transition hover:scale-105 hover:bg-[#168458] disabled:opacity-60"
          >
            {isAccepting ? <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Phone className="h-6 w-6" />}
          </button>
        </div>
        <p className="relative mt-4 text-xs text-emerald-100/60">{isAccepting ? 'Connecting…' : 'Tap green to answer'}</p>
      </div>
    </div>
  );
}
