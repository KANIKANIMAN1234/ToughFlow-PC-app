import { SignJWT } from "jose";
import type { User } from "@/lib/types";

const JWT_TTL_SEC = 60 * 60;

function readJwtSecret(): Uint8Array {
  const secret = process.env.SUPABASE_JWT_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "SUPABASE_JWT_SECRET が未設定です。Supabase ダッシュボードの JWT Secret を Vercel 環境変数に設定してください。"
    );
  }
  return new TextEncoder().encode(secret);
}

/** RLS 用カスタム JWT（role=authenticated + tenant_id / user_id / user_role） */
export async function signSupabaseJwt(user: User): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  return new SignJWT({
    role: "authenticated",
    tenant_id: user.tenantId,
    user_id: user.id,
    user_role: user.role,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setAudience("authenticated")
    .setIssuedAt(now)
    .setExpirationTime(now + JWT_TTL_SEC)
    .setIssuer(supabaseUrl ? `${supabaseUrl}/auth/v1` : "supabase")
    .sign(readJwtSecret());
}
