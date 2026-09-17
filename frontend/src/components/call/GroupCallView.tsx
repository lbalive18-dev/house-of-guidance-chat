import { useState } from 'react';
import type { UseCallReturn } from '@/hooks/useCall';
import { useElapsedTime } from '@/hooks/useElapsedTime';
import { useSpeakingIndicator } from '@/hooks/useSpeakingIndicator';
import ParticipantTile from '@/components/call/ParticipantTile';
import CallControls from '@/components/call/CallControls';

interface GroupCallViewProps {
  call: UseCallReturn;
  currentUserName: string;
  currentUserAvatar?: string | null;
  isAdmin?: boolean;
  onRemoveParticipant?: (userId: number) => void;
}

/** Group and room calls: live participant grid with real remote streams. */
export default function GroupCallView({
  call,
  currentUserName,
  currentUserAvatar,
  isAdmin = false,
  onRemoveParticipant,
}: GroupCallViewProps) {
  const { viewState, session, localStream, remotePeers, participants, isMuted, isCameraOff, error } = call;
  const [leaving, setLeaving] = useState(false);
  const isVideo = session?.media === 'video';
  const elapsed = useElapsedTime(session?.started_at, viewState === 'connected');

  const joinedCount = participants.filter((p) => p.status === 'joined').length;

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await call.leave();
    } finally {
      setLeaving(false);
    }
  };

  if (viewState === 'failed') {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="font-bold text-gray-900 dark:text-gray-50">Call failed</p>
        <p className="max-w-xs text-sm text-gray-500">{error || 'Something went wrong starting media.'}</p>
        <button type="button" onClick={call.dismiss} className="rounded-2xl border px-6 py-2.5 text-sm font-semibold">
          Back to chat
        </button>
      </div>
    );
  }

  if (viewState === 'ended') {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="font-bold text-gray-900 dark:text-gray-50">Call ended</p>
        <button type="button" onClick={call.dismiss} className="rounded-2xl border px-6 py-2.5 text-sm font-semibold">
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
          {viewState === 'connecting' || viewState === 'outgoing' ? 'Connecting…' : elapsed}
          <span className="ml-2 font-normal text-gray-400">
            {joinedCount} in call{isVideo ? ' • Video' : ' • Audio'}
          </span>
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <ParticipantTile
          name={currentUserName}
          avatarUrl={currentUserAvatar}
          stream={isVideo ? localStream : null}
          isLocal
          isMuted={isMuted}
          isCameraOff={!isVideo || isCameraOff || !localStream}
        />
        {remotePeers.map((peer) => {
          const record = participants.find((p) => p.user_id === peer.userId);
          return (
            <RemoteTile
              key={peer.userId}
              peerUserId={peer.userId}
              name={record?.user?.name ?? `User ${peer.userId}`}
              avatarUrl={record?.user?.avatar_url}
              stream={peer.stream}
              videoEnabled={isVideo}
              isMuted={record?.is_muted ?? peer.isMuted}
              isCameraOff={record?.is_camera_off ?? peer.isCameraOff}
              connectionState={peer.connectionState}
              canRemove={isAdmin && peer.userId !== session?.initiator_id}
              onRemove={() => onRemoveParticipant?.(peer.userId)}
            />
          );
        })}
      </div>

      {!isVideo &&
        remotePeers.map((peer) => peer.stream && <RemoteAudioSink key={peer.userId} stream={peer.stream} />)}

      {error && <p className="text-center text-sm text-red-600">{error}</p>}

      <CallControls
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        videoEnabled={!!isVideo}
        onToggleMute={() => void call.toggleMute()}
        onToggleCamera={() => void call.toggleCamera()}
        onEnd={() => void handleLeave()}
        endLabel={leaving ? 'Leaving…' : 'Leave call'}
      />
    </div>
  );
}

function RemoteTile(props: {
  peerUserId: number;
  name: string;
  avatarUrl?: string | null;
  stream: MediaStream | null;
  videoEnabled: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  connectionState: RTCPeerConnectionState;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const { stream, videoEnabled, ...rest } = props;
  const speaking = useSpeakingIndicator(stream, !props.isMuted);

  return (
    <div className="relative">
      <ParticipantTile
        name={rest.name}
        avatarUrl={rest.avatarUrl}
        stream={videoEnabled ? stream : null}
        isMuted={rest.isMuted}
        isCameraOff={!videoEnabled || rest.isCameraOff || !stream}
        speaking={speaking}
        connectionLabel={!stream ? rest.connectionState : undefined}
      />
      {rest.canRemove && (
        <button
          type="button"
          onClick={rest.onRemove}
          className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-red-600"
        >
          Remove
        </button>
      )}
    </div>
  );
}

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
