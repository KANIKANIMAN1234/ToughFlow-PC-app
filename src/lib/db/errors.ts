/** Supabase / PostgREST の英語エラーを利用者向けメッセージに変換 */
export function formatDbError(message: string): string {
  if (message.includes("schema cache") && message.includes("m_tenant")) {
    return [
      "データベースに m_tenant テーブルが見つかりません。",
      "① Supabase Dashboard → Table Editor で m_tenant があるか確認",
      "② 無ければ SQL 001〜008 を順に実行",
      "③ Vercel の NEXT_PUBLIC_SUPABASE_URL が SQL を実行したプロジェクトと一致するか確認",
      "④ SQL Editor で 009_api_grants_and_reload.sql を実行",
    ].join(" ");
  }

  if (message.includes("schema cache")) {
    return [
      "データベースのスキーマキャッシュが古い可能性があります。",
      "Supabase SQL Editor で NOTIFY pgrst, 'reload schema'; を実行してください。",
    ].join(" ");
  }

  if (message.includes("Supabase が未設定")) {
    return message;
  }

  return message;
}
