import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url || !hasServiceKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "環境変数が未設定です（NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY）",
        hasUrl: Boolean(url),
        hasServiceKey,
      },
      { status: 503 }
    );
  }

  let supabaseHost = url;
  try {
    supabaseHost = new URL(url).hostname;
  } catch {
    // keep raw url
  }

  try {
    const supabase = createAdminClient();
    const { data, error, count } = await supabase
      .from("m_tenant")
      .select("tenant_code, name, status", { count: "exact" })
      .limit(5);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          supabaseHost,
          error: error.message,
          hint:
            "Supabase Table Editor で m_tenant を確認し、009_api_grants_and_reload.sql を実行してください。",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      supabaseHost,
      tenantCount: count ?? data?.length ?? 0,
      tenants: data,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "DB 接続に失敗しました";
    return NextResponse.json({ ok: false, supabaseHost, error: message }, { status: 503 });
  }
}
