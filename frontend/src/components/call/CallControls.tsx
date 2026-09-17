import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';

interface CallControlsProps {
  isMuted: boolean;
  isCameraOff: boolean;
  videoEnabled: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onEnd: () => void;
  endLabel?: string;
}

export default function CallControls({
  isMuted,
  isCameraOff,
  videoEnabled,
  onToggleMute,
  onToggleCamera,
  onEnd,
  endLabel = 'End call',
}: CallControlsProps) {
  const button =
    'flex h-12 w-12 items-center justify-center rounded-full transition disabled:opacity-40';

  return (
    <div className="flex items-center justify-center gap-4">
      <button
        type="button"
        onClick={onToggleMute}
        aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        title={isMuted ? 'Unmute' : 'Mute'}
        className={`${button} ${isMuted ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-white'}`}
      >
        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </button>

      {videoEnabled && (
        <button
          type="button"
          onClick={onToggleCamera}
          aria-label={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
          title={isCameraOff ? 'Camera on' : 'Camera off'}
          className={`${button} ${isCameraOff ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-white'}`}
        >
          {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </button>
      )}

      <button
        type="button"
        onClick={onEnd}
        aria-label={endLabel}
        title={endLabel}
        className={`${button} h-14 w-14 bg-red-600 text-white hover:bg-red-700`}
      >
        <PhoneOff className="h-6 w-6" />
      </button>
    </div>
  );
}
