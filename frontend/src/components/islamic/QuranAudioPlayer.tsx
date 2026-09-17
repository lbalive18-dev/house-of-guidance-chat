import { Headphones } from 'lucide-react';

interface QuranAudioPlayerProps {
  src: string | null | undefined;
  reciterName: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  onError?: () => void;
  onCanPlay?: () => void;
}

/**
 * Shared Qur'an ayah audio player.
 *
 * Renders nothing but an honest notice when no verified audio exists —
 * it never invents a URL and never crashes on missing data.
 */
export default function QuranAudioPlayer({
  src,
  reciterName,
  autoPlay = false,
  onEnded,
  onError,
  onCanPlay,
}: QuranAudioPlayerProps) {
  if (!src) {
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <Headphones className="h-4 w-4 shrink-0" />
        Recitation audio is verified for Mishary Alafasy — unavailable for {reciterName}.
      </p>
    );
  }

  return (
    <div className="rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-950/40">
      <div className="mb-2 flex items-center gap-2">
        <Headphones className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
          {reciterName}
        </span>
      </div>
      <audio
        controls
        preload="metadata"
        src={src}
        autoPlay={autoPlay}
        onEnded={onEnded}
        onError={onError}
        onCanPlay={onCanPlay}
        className="h-10 w-full"
      />
    </div>
  );
}
