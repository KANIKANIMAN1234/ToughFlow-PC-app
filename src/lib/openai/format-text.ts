import {
  getFormatSystemPrompt,
  type VoiceFormatContext,
} from "@/lib/openai/voice-context";

export type FormatTextResult = {
  text: string;
  demo?: boolean;
};

export async function formatVoiceText(
  rawText: string,
  context: VoiceFormatContext
): Promise<FormatTextResult> {
  const input = rawText.trim();
  if (!input) {
    throw new Error("整形するテキストがありません");
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { text: input, demo: true };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: getFormatSystemPrompt(context) },
          { role: "user", content: input },
        ],
        max_tokens: 1200,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`OpenAI API エラー: ${detail}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("整形結果が空です");

    return { text: content };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("AI 整形がタイムアウトしました。もう一度お試しください。");
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}
