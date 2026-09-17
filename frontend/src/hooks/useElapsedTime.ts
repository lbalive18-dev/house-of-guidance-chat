import { useEffect, useState } from 'react';

export function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Ticks every second from the given start ISO timestamp (or mount time). */
export function useElapsedTime(startedAt: string | null | undefined, running: boolean): string {
  const [label, setLabel] = useState('0:00');

  useEffect(() => {
    if (!running) return;
    const start = startedAt ? new Date(startedAt).getTime() : Date.now();
    const tick = () => {
      setLabel(formatElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000))));
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt, running]);

  return label;
}
