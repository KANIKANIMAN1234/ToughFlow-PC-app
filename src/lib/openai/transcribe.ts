export type TranscribeResult = {
  text: string;
  demo?: boolean;
};

const WHISPER_MODEL = "whisper-1";
const MAX_BYTES = 25 * 1024 * 1024;

export async function transcribeAudio(
  buffer: ArrayBuffer,
  mimeType: string,
  filename = "audio.webm"
): Promise<TranscribeResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY が未設定です。Web Speech 音声入力をご利用ください。"
    );
  }

  if (buffer.byteLength > MAX_BYTES) {
    throw new Error("音声ファイルが大きすぎます（25MB 以内）");
  }

  const blob = new Blob([buffer], { type: mimeType || "audio/webm" });
  const form = new FormData();
  form.append("file", blob, filename);
  form.append("model", WHISPER_MODEL);
  form.append("language", "ja");
  form.append("response_format", "json");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`OpenAI Whisper エラー: ${detail}`);
    }

    const data = (await res.json()) as { text?: string };
    const text = data.text?.trim();
    if (!text) throw new Error("文字起こし結果が空です");

    return { text };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("文字起こしがタイムアウトしました。もう一度お試しください。");
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}
