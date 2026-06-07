import { NextRequest, NextResponse } from "next/server";
import { getSiteSurvey, listSiteSurveys } from "@/lib/db/repository";
import { withAnyPermission } from "@/lib/permissions/check";

export async function GET(request: NextRequest) {
  return withAnyPermission(
    request,
    ["site_survey_register", "site_survey_view_shared"],
    async ({ session }) => {
      const id = request.nextUrl.searchParams.get("id");
      const userId = request.nextUrl.searchParams.get("userId") ?? undefined;

      try {
        if (id) {
          const survey = await getSiteSurvey(session.tenantId, id);
          if (!survey) {
            return NextResponse.json({ error: "not found" }, { status: 404 });
          }
          return NextResponse.json({ survey });
        }

        const surveys = await listSiteSurveys(session.tenantId, userId);
        return NextResponse.json({ surveys });
      } catch (e) {
        const message = e instanceof Error ? e.message : "取得に失敗しました";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }
  );
}
