import { useEffect, useRef } from 'react';
import { MicOff, VideoOff } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';

interface ParticipantTileProps {
  name: string;
  avatarUrl?: string | null;
  stream: MediaStream | null;
  isLocal?: boolean;
  isMuted?: boolean;
  isCameraOff?: boolean;
  speaking?: boolean;
  connectionLabel?: string;
}

export default function ParticipantTile({
  name,
  avatarUrl,
  stream,
  isLocal = false,
  isMuted = false,
  isCameraOff = false,
  speaking = false,
  connectionLabel,
}: ParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = videoRef.current;
    if (element && stream) {
      element.srcObject = stream;
    }
    return () => {
      if (element) element.srcObject = null;
    };
  }, [stream]);

  const showVideo = !!stream && !isCameraOff;

  return (
    <div
      className={`relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-slate-900 ${
        speaking ? 'ring-2 ring-emerald-400' : ''
      }`}
    >
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`h-full w-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <Avatar name={name} avatarUrl={avatarUrl} />
      )}

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white">
        <span className="max-w-28 truncate">
          {name}
          {isLocal ? ' (you)' : ''}
        </span>
        {isMuted && <MicOff className="h-3 w-3 text-red-300" />}
        {isCameraOff && <VideoOff className="h-3 w-3 text-red-300" />}
      </div>

      {connectionLabel && (
        <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white/80">
          {connectionLabel}
        </span>
      )}
    </div>
  );
}
