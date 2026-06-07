import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { signSupabaseJwt } from "@/lib/supabase/jwt";
import type { User } from "@/lib/types";

function readSupabaseAnonEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Supabase anon キーが未設定です。NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください。"
    );
  }
  return { url, key };
}

/** セッションユーザー向け Supabase クライアント（RLS 適用） */
export async function createUserClient(user: User): Promise<SupabaseClient> {
  const { url, key } = readSupabaseAnonEnv();
  const accessToken = await signSupabaseJwt(user);
  return createClient(url, key, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
