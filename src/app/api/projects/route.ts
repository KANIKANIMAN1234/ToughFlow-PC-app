import { NextRequest, NextResponse } from "next/server";
import { listProjects } from "@/lib/db/repository";
import { requireAnyPermission } from "@/lib/permissions/check";

export async function GET(request: NextRequest) {
  const auth = await requireAnyPermission(request, [
    "project_list_other",
    "daily_report_register",
    "site_survey_register",
  ]);
  if (auth instanceof Response) return auth;

  try {
    const projects = await listProjects(auth.session.tenantId, {
      userId: auth.session.id,
      role: auth.session.role,
    });
    return NextResponse.json({ projects });
  } catch (e) {
    const message = e instanceof Error ? e.message : "取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
