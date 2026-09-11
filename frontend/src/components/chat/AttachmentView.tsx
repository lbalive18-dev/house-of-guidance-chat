import { useState } from 'react';
import { FileText, Pause, Play } from 'lucide-react';
import { formatFileSize } from '@/lib/format';
import type { Attachment, MessageType } from '@/types/chat';

export default function AttachmentView({ attachment, type }: { attachment: Attachment; type: MessageType }) {
  if (type === 'image') {
    return (
      <a href={attachment.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg">
        <img src={attachment.url} alt={attachment.original_name} className="max-h-72 w-full object-cover" loading="lazy" />
      </a>
    );
  }

  if (type === 'voice') {
    return <VoiceNotePlayer attachment={attachment} />;
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      download={attachment.original_name}
      className="flex items-center gap-3 rounded-lg border border-black/5 bg-black/5 px-3 py-2.5 hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
    >
      <FileText className="h-8 w-8 shrink-0 text-secondary-600" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{attachment.original_name}</p>
        <p className="text-xs opacity-70">{formatFileSize(attachment.size_bytes)}</p>
      </div>
    </a>
  );
}

function VoiceNotePlayer({ attachment }: { attachment: Attachment }) {
  const [playing, setPlaying] = useState(false);
  const [audio] = useState(() => new Audio(attachment.url));

  const toggle = () => {
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  };

  audio.onended = () => setPlaying(false);

  return (
    <div className="flex items-center gap-3 rounded-lg bg-black/5 px-3 py-2.5 dark:bg-white/5">
      <button
        type="button"
        onClick={toggle}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
      </button>
      <div className="h-1 flex-1 rounded-full bg-black/10 dark:bg-white/20" />
      {attachment.duration_seconds !== null && (
        <span className="text-xs opacity-70">
          {Math.floor(attachment.duration_seconds / 60)}:{(attachment.duration_seconds % 60).toString().padStart(2, '0')}
        </span>
      )}
    </div>
  );
}
