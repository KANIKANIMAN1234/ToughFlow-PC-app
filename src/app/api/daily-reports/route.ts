import { NextRequest, NextResponse } from "next/server";
import { getDailyReport, listDailyReports } from "@/lib/db/repository";
import { requireAnyPermission } from "@/lib/permissions/check";

export async function GET(request: NextRequest) {
  const auth = await requireAnyPermission(request, [
    "daily_report_view_all",
    "daily_report_register",
  ]);
  if (auth instanceof Response) return auth;

  const id = request.nextUrl.searchParams.get("id");
  try {
    if (id) {
      const report = await getDailyReport(auth.session.tenantId, id);
      if (!report) {
        return NextResponse.json({ error: "not found" }, { status: 404 });
      }
      return NextResponse.json({ report });
    }
    const userId = request.nextUrl.searchParams.get("userId") ?? undefined;
    const reports = await listDailyReports(auth.session.tenantId, userId);
    return NextResponse.json({ reports });
  } catch (e) {
    const message = e instanceof Error ? e.message : "取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
