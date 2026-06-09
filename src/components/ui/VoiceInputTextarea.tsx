"use client";

import { Loader2, Mic, Sparkles, Square } from "lucide-react";
import type { ReactNode, TextareaHTMLAttributes } from "react";
import { useCallback, useState } from "react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechInput } from "@/hooks/useSpeechInput";
import { useVoiceAi } from "@/hooks/useVoiceAi";
import type { VoiceFormatContext } from "@/lib/openai/voice-context";
import { cn } from "@/lib/utils";

type VoiceInputTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange"
> & {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  header?: ReactNode;
  textareaClassName?: string;
  formatContext?: VoiceFormatContext;
  autoFormatAfterRecord?: boolean;
};

function appendTranscript(current: string, spoken: string) {
  const addition = spoken.trim();
  if (!addition) return current;
  if (!current.trim()) return addition;
  return `${current.replace(/\n$/, "")}\n${addition}`;
}

export function VoiceInputTextarea({
  value,
  onChange,
  label,
  header,
  className,
  textareaClassName,
  placeholder,
  formatContext,
  autoFormatAfterRecord = true,
  ...props
}: VoiceInputTextareaProps) {
  const [error, setError] = useState<string | null>(null);
  const { listening, supported: speechSupported, toggle: toggleSpeech } =
    useSpeechInput({
      onFinalTranscript: (text) => onChange(appendTranscript(value, text)),
    });
  const {
    recording,
    supported: recordSupported,
    start: startRecording,
    stop: stopRecording,
  } = useAudioRecorder();
  const { transcribing, formatting, busy, transcribe, formatText } =
    useVoiceAi();

  const canFormat = Boolean(formatContext);
  const showAiFormat = canFormat && value.trim().length > 0;

  const handleFormat = useCallback(
    async (sourceText?: string) => {
      if (!formatContext) return;
      const text = (sourceText ?? value).trim();
      if (!text) return;
      setError(null);
      try {
        const formatted = await formatText(text, formatContext);
        onChange(formatted);
      } catch (e) {
        setError(e instanceof Error ? e.message : "AI 整形に失敗しました");
      }
    },
    [formatContext, formatText, onChange, value]
  );

  const handleRecordToggle = useCallback(async () => {
    setError(null);
    if (recording) {
      try {
        const blob = await stopRecording();
        if (!blob || blob.size === 0) return;
        const transcript = await transcribe(blob);
        const combined = appendTranscript(value, transcript);
        if (canFormat && autoFormatAfterRecord) {
          const formatted = await formatText(combined, formatContext!);
          onChange(formatted);
        } else {
          onChange(combined);
        }
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "録音・文字起こしに失敗しました"
        );
      }
      return;
    }
    try {
      await startRecording();
    } catch (e) {
      setError(e instanceof Error ? e.message : "マイクの利用を許可してください");
    }
  }, [
    autoFormatAfterRecord,
    canFormat,
    handleFormat,
    onChange,
    recording,
    startRecording,
    stopRecording,
    formatContext,
    formatText,
    transcribe,
    value,
  ]);

  const headerRow = header ?? (
    label ? (
      <span className="text-caption font-normal text-apple-text">{label}</span>
    ) : null
  );

  const hasVoiceControls = speechSupported || recordSupported || showAiFormat;

  return (
    <div className={cn("space-y-1.5", className)}>
      {(headerRow || hasVoiceControls) && (
        <div className="flex items-center justify-between gap-2">
          {headerRow ? <div className="min-w-0 flex-1">{headerRow}</div> : <span />}
          <div className="flex shrink-0 items-center gap-1">
            {recordSupported && (
              <button
                type="button"
                onClick={handleRecordToggle}
                disabled={busy || listening}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium focus-apple disabled:opacity-50",
                  recording
                    ? "bg-red-50 text-red-600"
                    : "bg-violet-50 text-violet-700"
                )}
                aria-label={recording ? "録音を停止して文字起こし" : "録音して文字起こし"}
              >
                {transcribing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : recording ? (
                  <Square className="h-3.5 w-3.5 fill-current" />
                ) : (
                  <Mic className="h-3.5 w-3.5" />
                )}
                {transcribing
                  ? "文字起こし中"
                  : recording
                    ? "停止"
                    : "録音"}
              </button>
            )}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleSpeech}
                disabled={busy || recording}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium focus-apple disabled:opacity-50",
                  listening
                    ? "bg-red-50 text-red-600"
                    : "bg-brand-50 text-brand-600"
                )}
                aria-label={listening ? "音声入力を停止" : "音声入力を開始"}
              >
                {listening ? (
                  <>
                    <Square className="h-3.5 w-3.5 fill-current" />
                    停止
                  </>
                ) : (
                  <>
                    <Mic className="h-3.5 w-3.5" />
                    音声
                  </>
                )}
              </button>
            )}
            {showAiFormat && (
              <button
                type="button"
                onClick={() => handleFormat()}
                disabled={busy || listening || recording}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 focus-apple disabled:opacity-50"
                aria-label="AI 整形"
              >
                {formatting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                AI整形
              </button>
            )}
            {!speechSupported && !recordSupported && (
              <span className="text-[10px] text-apple-glyph">音声非対応</span>
            )}
          </div>
        </div>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "focus-apple w-full rounded-xl border border-surface-border bg-white px-3 py-3 text-body text-apple-text outline-none",
          textareaClassName
        )}
        {...props}
      />
      {listening && (
        <p className="text-[10px] text-brand-600">
          音声を認識中…話し終わったら「停止」を押してください
        </p>
      )}
      {recording && !transcribing && (
        <p className="text-[10px] text-violet-700">
          録音中…話し終わったら「停止」を押すと Whisper で文字起こしします
        </p>
      )}
      {error && <p className="text-[10px] text-red-600">{error}</p>}
    </div>
  );
}
