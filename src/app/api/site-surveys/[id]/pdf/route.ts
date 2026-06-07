import { NextRequest, NextResponse } from "next/server";
import { getSiteSurvey } from "@/lib/db/repository";
import {
  buildSiteSurveyPdfFilename,
  loadSiteSurveyPdfContext,
} from "@/lib/pdf/site-survey-context";
import { renderSiteSurveyPdf } from "@/lib/pdf/render-site-survey-pdf";
import { withAnyPermission } from "@/lib/permissions/check";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withAnyPermission(
    request,
    ["site_survey_register", "site_survey_view_shared"],
    async ({ session }) => {
      const { id } = await params;
      try {
        const survey = await getSiteSurvey(session.tenantId, id);
        if (!survey) {
          return NextResponse.json({ error: "not found" }, { status: 404 });
        }

        const ctx = await loadSiteSurveyPdfContext(session.tenantId, survey);
        const pdf = await renderSiteSurveyPdf(ctx);
        const filename = buildSiteSurveyPdfFilename(survey);
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
