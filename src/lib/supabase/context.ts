import { AsyncLocalStorage } from "async_hooks";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@/lib/types";
import { createUserClient } from "@/lib/supabase/user-client";

const dbContext = new AsyncLocalStorage<SupabaseClient>();

/** API ハンドラ内で runWithDbContext 経由のクライアントを取得 */
export function getDbClient(): SupabaseClient {
  const client = dbContext.getStore();
  if (!client) {
    throw new Error(
      "DB コンテキストが未設定です。API ルートを withDbSession / withPermission でラップしてください。"
    );
  }
  return client;
}

/** セッションユーザーの JWT クライアントで DB 操作を実行（RLS 適用） */
export async function runWithDbContext<T>(
  user: User,
  fn: () => Promise<T>
): Promise<T> {
  const client = await createUserClient(user);
  return dbContext.run(client, fn);
}
