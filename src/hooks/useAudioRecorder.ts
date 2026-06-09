"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

export function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setSupported(
      typeof navigator !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia &&
        typeof MediaRecorder !== "undefined"
    );
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const stop = useCallback((): Promise<Blob | null> => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      stopTracks();
      setRecording(false);
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      recorder.onstop = () => {
        stopTracks();
        recorderRef.current = null;
        setRecording(false);
        if (chunksRef.current.length === 0) {
          resolve(null);
          return;
        }
        const type = recorder.mimeType || chunksRef.current[0]?.type;
        resolve(new Blob(chunksRef.current, { type: type || "audio/webm" }));
      };
      recorder.stop();
    });
  }, [stopTracks]);

  const start = useCallback(async (): Promise<void> => {
    if (!supported) return;

    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      await stop();
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    chunksRef.current = [];

    const mimeType = pickMimeType();
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onerror = () => {
      stopTracks();
      recorderRef.current = null;
      setRecording(false);
    };

    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
  }, [supported, stop, stopTracks]);

  const toggle = useCallback(async () => {
    if (recording) return stop();
    await start();
    return null;
  }, [recording, start, stop]);

  useEffect(
    () => () => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      stopTracks();
    },
    [stopTracks]
  );

  return { recording, supported, start, stop, toggle };
}
