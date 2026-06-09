import type { ParsedProjectEmail } from "@/lib/types";

const SYSTEM_PROMPT = [
  "あなたは建設・重量物運搬業の案件受付アシスタントです。",
  "顧客から届いたメール本文を解析し、案件登録フォーム用の情報を抽出してください。",
  "推測で補完せず、本文に明示されている情報のみを記入してください。",
  "不明な項目は空文字にしてください。",
  "作業開始日は YYYY-MM-DD 形式。年が不明なら空文字。",
  "JSON のみを返してください。",
].join("\n");

const JSON_SCHEMA = `{
  "projectName": "案件名・件名・工事名",
  "customerName": "顧客会社名",
  "address": "現場住所または会社住所",
  "clientContactName": "顧客側担当者の氏名",
  "clientContactTitle": "顧客側担当者の役職",
  "clientContactPhone": "電話番号",
  "clientContactEmail": "メールアドレス",
  "projectSummary": "案件概要・依頼内容の要約",
  "workStartDate": "作業開始予定日 YYYY-MM-DD"
}`;

function normalizeParsed(raw: Record<string, unknown>): ParsedProjectEmail {
  const str = (key: string) => {
    const v = raw[key];
    return typeof v === "string" ? v.trim() : undefined;
  };
  return {
    projectName: str("projectName"),
    customerName: str("customerName"),
    address: str("address"),
    clientContactName: str("clientContactName"),
    clientContactTitle: str("clientContactTitle"),
    clientContactPhone: str("clientContactPhone"),
    clientContactEmail: str("clientContactEmail"),
    projectSummary: str("projectSummary"),
    workStartDate: str("workStartDate"),
  };
}

export type ParseProjectEmailResult = {
  parsed: ParsedProjectEmail;
  demo?: boolean;
};

export async function parseProjectEmail(
  emailText: string
): Promise<ParseProjectEmailResult> {
  const input = emailText.trim();
  if (!input) throw new Error("メール本文を入力してください");

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY が未設定です。環境変数を設定してください。"
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `以下のJSON形式で抽出してください:\n${JSON_SCHEMA}\n\n--- メール本文 ---\n${input}`,
          },
        ],
        max_tokens: 1500,
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
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("解析結果が空です");

    const raw = JSON.parse(content) as Record<string, unknown>;
    return { parsed: normalizeParsed(raw) };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("AI 解析がタイムアウトしました。もう一度お試しください。");
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}
