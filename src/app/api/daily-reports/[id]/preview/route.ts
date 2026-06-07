import { NextRequest, NextResponse } from "next/server";
import { loadDailyReportPdfContext } from "@/lib/pdf/daily-report-context";
import { renderDailyReportHtml } from "@/lib/pdf/daily-report-html";
import { requireAnyPermission } from "@/lib/permissions/check";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyPermission(request, [
    "daily_report_view_all",
    "daily_report_register",
  ]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  try {
    const ctx = await loadDailyReportPdfContext(auth.session.tenantId, id);
    if (!ctx) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const html = renderDailyReportHtml(ctx);
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "プレビュー生成に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
