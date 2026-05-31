import { NextRequest, NextResponse } from "next/server";
import { getDailyReport, listDailyReports } from "@/lib/store/mock-store";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    const report = getDailyReport(id);
    if (!report) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ report });
  }
  const userId = request.nextUrl.searchParams.get("userId") ?? undefined;
  return NextResponse.json({ reports: listDailyReports(userId) });
}
