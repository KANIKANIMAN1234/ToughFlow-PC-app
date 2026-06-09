"use client";

import { useCallback, useState } from "react";
import type { VoiceFormatContext } from "@/lib/openai/voice-context";

type TranscribeResponse = { text: string; demo?: boolean };
type FormatResponse = { text: string; demo?: boolean };

export function useVoiceAi() {
  const [transcribing, setTranscribing] = useState(false);
  const [formatting, setFormatting] = useState(false);

  const transcribe = useCallback(async (blob: Blob): Promise<string> => {
    setTranscribing(true);
    try {
      const form = new FormData();
      const ext = blob.type.includes("mp4")
        ? "m4a"
        : blob.type.includes("mpeg")
          ? "mp3"
          : "webm";
      form.append("file", blob, `recording.${ext}`);

      const res = await fetch("/api/voice/transcribe", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const data = (await res.json()) as TranscribeResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "文字起こしに失敗しました");
      }
      return data.text;
    } finally {
      setTranscribing(false);
    }
  }, []);

  const formatText = useCallback(
    async (text: string, context: VoiceFormatContext): Promise<string> => {
      setFormatting(true);
      try {
        const res = await fetch("/api/voice/format", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ text, context }),
        });
        const data = (await res.json()) as FormatResponse & { error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? "AI 整形に失敗しました");
        }
        return data.text;
      } finally {
        setFormatting(false);
      }
    },
    []
  );

  return {
    transcribing,
    formatting,
    busy: transcribing || formatting,
    transcribe,
    formatText,
  };
}
