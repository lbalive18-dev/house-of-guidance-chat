import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UseCallReturn } from '@/hooks/useCall';
import { useElapsedTime } from '@/hooks/useElapsedTime';
import Avatar from '@/components/ui/Avatar';
import ParticipantTile from '@/components/call/ParticipantTile';
import CallControls from '@/components/call/CallControls';

interface ActiveCallViewProps {
  call: UseCallReturn;
  currentUserId: number;
  currentUserName: string;
  currentUserAvatar?: string | null;
}

/** One-to-one audio/video call: ringing, connecting, live, and ended states. */
export default function ActiveCallView({ call, currentUserId, currentUserName, currentUserAvatar }: ActiveCallViewProps) {
  const navigate = useNavigate();
  const { viewState, session, localStream, remotePeers, isMuted, isCameraOff, error, endReason } = call;
  const [leaving, setLeaving] = useState(false);

  const other = session?.participants?.find(
    (p) => p.user_id !== currentUserId && ['invited', 'joined'].includes(p.status),
  );
  const remote = remotePeers[0] ?? null;
  const isVideo = session?.media === 'video';
  const elapsed = useElapsedTime(session?.started_at, viewState === 'connected');

  useEffect(() => {
    if (viewState === 'ended' && endReason === 'declined') {
      const timer = window.setTimeout(() => navigate('/'), 2500);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [viewState, endReason, navigate]);

  const handleEnd = async () => {
    setLeaving(true);
    try {
      if (session && session.initiator_id === currentUserId) {
        await call.end();
      } else {
        await call.leave();
      }
    } finally {
      setLeaving(false);
    }
  };

  if (viewState === 'outgoing') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
        <Avatar name={other?.user?.name ?? '…'} avatarUrl={other?.user?.avatar_url} size="xl" />
        <div>
          <p className="font-bold text-gray-900 dark:text-gray-50">Calling {other?.user?.name ?? '…'}</p>
          <p className="text-sm text-gray-500">Ringing…</p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={() => void call.cancel()}
          className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-bold text-white"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (viewState === 'failed') {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="font-bold text-gray-900 dark:text-gray-50">Call failed</p>
        <p className="max-w-xs text-sm text-gray-500">{error || 'Something went wrong starting media.'}</p>
        <button
          type="button"
          onClick={call.dismiss}
          className="rounded-2xl border px-6 py-2.5 text-sm font-semibold"
        >
          Back to chat
        </button>
      </div>
    );
  }

  if (viewState === 'ended') {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="font-bold text-gray-900 dark:text-gray-50">
          {endReason === 'cancelled' ? 'Call cancelled' : endReason === 'declined' ? 'Call declined' : 'Call ended'}
        </p>
        <button
          type="button"
          onClick={call.dismiss}
          className="rounded-2xl border px-6 py-2.5 text-sm font-semibold"
        >
          Back to chat
        </button>
      </div>
    );
  }

  if (viewState === 'idle') return null;

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          {viewState === 'connecting' ? 'Connecting…' : elapsed}
          <span className="ml-2 font-normal text-gray-400">
            {isVideo ? 'Video call' : 'Audio call'} with {other?.user?.name ?? '…'}
          </span>
        </p>
      </div>

      {isVideo ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <ParticipantTile
            name={currentUserName}
            avatarUrl={currentUserAvatar}
            stream={localStream}
            isLocal
            isMuted={isMuted}
            isCameraOff={isCameraOff || !localStream}
          />
          <ParticipantTile
            name={other?.user?.name ?? '…'}
            avatarUrl={other?.user?.avatar_url}
            stream={remote?.stream ?? null}
            isMuted={other?.is_muted}
            isCameraOff={other?.is_camera_off}
            connectionLabel={remote && !remote.stream ? remote.connectionState : undefined}
          />
        </div>
      ) : (
        <div className="flex items-center gap-4 rounded-3xl bg-slate-50 p-5 dark:bg-slate-800">
          <Avatar name={other?.user?.name ?? '…'} avatarUrl={other?.user?.avatar_url} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-gray-900 dark:text-gray-50">{other?.user?.name ?? '…'}</p>
            <p className="text-sm text-gray-500">
              {viewState === 'connecting' ? 'Connecting…' : `${elapsed} • ${isMuted ? 'Muted' : 'Live'}`}
            </p>
          </div>
          {/* Remote audio attaches here; no visible element needed. */}
          {remote?.stream && <RemoteAudioSink stream={remote.stream} />}
        </div>
      )}

      {error && <p className="text-center text-sm text-red-600">{error}</p>}

      <CallControls
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        videoEnabled={isVideo}
        onToggleMute={() => void call.toggleMute()}
        onToggleCamera={() => void call.toggleCamera()}
        onEnd={() => void handleEnd()}
        endLabel={leaving ? 'Leaving…' : 'End call'}
      />
    </div>
  );
}

/** Invisible audio element so remote audio actually plays in audio calls. */
function RemoteAudioSink({ stream }: { stream: MediaStream }) {
  return (
    <audio
      autoPlay
      playsInline
      ref={(element) => {
        if (element && element.srcObject !== stream) element.srcObject = stream;
      }}
    />
  );
}
