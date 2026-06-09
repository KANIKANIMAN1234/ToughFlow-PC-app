import { NextRequest, NextResponse } from "next/server";

import { dispatchAgreement36LineAlerts } from "@/lib/attendance/agreement-36-line-notify";
import {
  getTenantAdminUser,
  listActiveTenantIds,
} from "@/lib/db/repository";
import { runWithDbContext } from "@/lib/supabase/context";

function isAuthorizedCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization")?.trim();
  if (auth === `Bearer ${secret}`) return true;
  return request.headers.get("x-cron-secret") === secret;
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenantIds = await listActiveTenantIds();
    const results: {
      tenantId: string;
      ok: boolean;
      error?: string;
      dispatch?: Awaited<ReturnType<typeof dispatchAgreement36LineAlerts>>;
    }[] = [];

    for (const tenantId of tenantIds) {
      const admin = await getTenantAdminUser(tenantId);
      if (!admin) {
        results.push({
          tenantId,
          ok: false,
          error: "管理者ユーザーが見つかりません",
        });
        continue;
      }

      try {
        const dispatch = await runWithDbContext(admin, () =>
          dispatchAgreement36LineAlerts(tenantId)
        );
        results.push({ tenantId, ok: true, dispatch });
      } catch (e) {
        const message = e instanceof Error ? e.message : "処理に失敗しました";
        results.push({ tenantId, ok: false, error: message });
      }
    }

    return NextResponse.json({
      processedAt: new Date().toISOString(),
      tenantCount: tenantIds.length,
      results,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cron 処理に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
