import { assertLineMessagingConfig, getLineConfig } from "@/lib/line/config";

const PUSH_URL = "https://api.line.me/v2/bot/message/push";

export type LinePushResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string; status?: number };

export function isLineMessagingConfigured(): boolean {
  return getLineConfig().messagingEnabled;
}

export async function pushTextMessage(
  lineUserId: string,
  text: string
): Promise<LinePushResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: "送信テキストが空です" };
  }
  if (!lineUserId.trim()) {
    return { ok: false, error: "LINE ユーザー ID が未設定です" };
  }

  const { channelAccessToken } = assertLineMessagingConfig();

  const response = await fetch(PUSH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${channelAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: lineUserId.trim(),
      messages: [{ type: "text", text: trimmed }],
    }),
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) detail = body.message;
    } catch {
      // ignore parse errors
    }
    return { ok: false, error: detail, status: response.status };
  }

  const data = (await response.json()) as {
    sentMessages?: { id: string }[];
  };
  const messageId = data.sentMessages?.[0]?.id ?? "";
  return { ok: true, messageId };
}
