import { NextRequest, NextResponse } from "next/server";
import { getDailyReport, listDailyReports } from "@/lib/db/repository";
import {
  getSessionFromRequest,
  unauthorizedResponse,
} from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();

  const id = request.nextUrl.searchParams.get("id");
  try {
    if (id) {
      const report = await getDailyReport(session.tenantId, id);
      if (!report) {
        return NextResponse.json({ error: "not found" }, { status: 404 });
      }
      return NextResponse.json({ report });
    }
    const userId = request.nextUrl.searchParams.get("userId") ?? undefined;
    const reports = await listDailyReports(session.tenantId, userId);
    return NextResponse.json({ reports });
  } catch (e) {
    const message = e instanceof Error ? e.message : "取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
