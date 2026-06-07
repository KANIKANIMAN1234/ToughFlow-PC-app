import { NextRequest, NextResponse } from "next/server";
import {
  buildPdfFilename,
  loadDailyReportPdfContext,
} from "@/lib/pdf/daily-report-context";
import { renderDailyReportPdf } from "@/lib/pdf/render-daily-report-pdf";
import { withAnyPermission } from "@/lib/permissions/check";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withAnyPermission(
    request,
    ["daily_report_view_all", "daily_report_register"],
    async ({ session }) => {
      const { id } = await params;
      try {
        const ctx = await loadDailyReportPdfContext(session.tenantId, id);
        if (!ctx) {
          return NextResponse.json({ error: "not found" }, { status: 404 });
        }

        const pdf = await renderDailyReportPdf(ctx);
        const filename = buildPdfFilename(ctx.report);
        const encoded = encodeURIComponent(filename);

        return new NextResponse(new Uint8Array(pdf), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename*=UTF-8''${encoded}`,
            "Cache-Control": "no-store",
          },
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "PDF 生成に失敗しました";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }
  );
}
