import { NextRequest, NextResponse } from "next/server";

import { dispatchAgreement36LineAlerts } from "@/lib/attendance/agreement-36-line-notify";
import { withPermission } from "@/lib/permissions/check";

export async function GET(request: NextRequest) {
  return withPermission(request, "admin_settings", async ({ session }) => {
    try {
      const result = await dispatchAgreement36LineAlerts(session.tenantId, {
        dryRun: true,
      });
      return NextResponse.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "取得に失敗しました";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}

export async function POST(request: NextRequest) {
  return withPermission(request, "admin_settings", async ({ session }) => {
    try {
      const body = (await request.json().catch(() => ({}))) as {
        dryRun?: boolean;
      };
      const result = await dispatchAgreement36LineAlerts(session.tenantId, {
        dryRun: body.dryRun ?? false,
      });
      return NextResponse.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "送信に失敗しました";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
