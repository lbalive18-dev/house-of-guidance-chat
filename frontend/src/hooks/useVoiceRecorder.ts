import { useCallback, useRef, useState } from 'react';

interface UseVoiceRecorderResult {
  isRecording: boolean;
  seconds: number;
  start: () => Promise<void>;
  stop: () => Promise<{ blob: Blob; seconds: number } | null>;
  cancel: () => void;
}

export function useVoiceRecorder(): UseVoiceRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    mediaRecorderRef.current = null;
    streamRef.current = null;
    setIsRecording(false);
    setSeconds(0);
  }, []);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    chunksRef.current = [];

    const supportedMimeType = [
      'audio/webm;codecs=opus',
      'audio/mp4',
      'audio/webm',
      'audio/ogg;codecs=opus',
    ].find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
    const recorder = supportedMimeType
      ? new MediaRecorder(stream, { mimeType: supportedMimeType })
      : new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setSeconds(0);

    intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }, []);

  const stop = useCallback(async (): Promise<{ blob: Blob; seconds: number } | null> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return null;

    const finalSeconds = seconds;

    return new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || chunksRef.current[0]?.type || 'audio/webm',
        });
        cleanup();
        resolve({ blob, seconds: finalSeconds });
      };
      recorder.stop();
    });
  }, [cleanup, seconds]);

  const cancel = useCallback(() => {
    mediaRecorderRef.current?.stop();
    cleanup();
  }, [cleanup]);

  return { isRecording, seconds, start, stop, cancel };
}
