import { useEffect, useState } from 'react';

/**
 * Real speaking detection from a remote audio track via the Web Audio API.
 * No fake animation: silence reads silent.
 */
export function useSpeakingIndicator(stream: MediaStream | null, enabled: boolean): boolean {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!stream || !enabled) {
      setSpeaking(false);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      setSpeaking(false);
      return;
    }

    let context: AudioContext | null = null;
    let raf = 0;
    let alive = true;

    try {
      const AudioCtor: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      context = new AudioCtor();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const loop = () => {
        if (!alive) return;
        analyser.getByteFrequencyData(data);
        const level = data.reduce((sum, v) => sum + v, 0) / data.length;
        setSpeaking(level > 12);
        raf = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      setSpeaking(false);
    }

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      void context?.close().catch(() => undefined);
    };
  }, [stream, enabled]);

  return speaking;
}
