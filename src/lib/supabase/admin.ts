import { createClient } from "@supabase/supabase-js";

function readSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Supabase が未設定です。NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を Vercel 環境変数に設定してください。"
    );
  }
  return { url, key };
}

/** Supabase 由来の英語エラーを利用者向けメッセージに変換 */
export function toSupabaseUserMessage(message: string): string {
  if (message.includes("Invalid API key")) {
    return "Supabase API キーが無効です。Vercel の NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が同一プロジェクトの値か確認し、再デプロイしてください。";
  }
  return message;
}

export function createAdminClient() {
  const { url, key } = readSupabaseEnv();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
