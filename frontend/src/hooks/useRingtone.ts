import { useEffect } from 'react';

type RingtoneKind = 'incoming' | 'outgoing';

let callAudioContext: AudioContext | null = null;

function getCallAudioContext(): AudioContext | null {
  if (typeof window === 'undefined' || !window.AudioContext) return null;
  if (!callAudioContext || callAudioContext.state === 'closed') {
    callAudioContext = new window.AudioContext();
  }
  return callAudioContext;
}

/** Call from the click handler that starts or accepts a call to unlock mobile audio. */
export function unlockCallAudio(): void {
  const context = getCallAudioContext();
  if (context?.state === 'suspended') void context.resume().catch(() => undefined);
}

function playTone(context: AudioContext, frequencies: number[], start: number, duration: number): void {
  frequencies.forEach((frequency) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.12, start + 0.025);
    gain.gain.setValueAtTime(0.12, start + duration * 0.72);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
  });
}

export function useRingtone(enabled: boolean, kind: RingtoneKind): void {
  useEffect(() => {
    if (!enabled) return;
    const context = getCallAudioContext();
    if (!context) return;
    void context.resume().catch(() => undefined);

    let stopped = false;
    let timer = 0;
    const playCycle = () => {
      if (stopped) return;
      if (context.state !== 'running') {
        timer = window.setTimeout(playCycle, 500);
        return;
      }
      const base = context.currentTime + 0.04;

      if (kind === 'incoming') {
        const notes = [659, 784, 988, 784, 659, 523];
        notes.forEach((note, index) => playTone(context, [note], base + index * 0.2, 0.16));
        if ('vibrate' in navigator) navigator.vibrate([180, 90, 180]);
        timer = window.setTimeout(playCycle, 2500);
      } else {
        playTone(context, [425, 450], base, 1.45);
        timer = window.setTimeout(playCycle, 4000);
      }
    };

    playCycle();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      if ('vibrate' in navigator) navigator.vibrate(0);
    };
  }, [enabled, kind]);
}
