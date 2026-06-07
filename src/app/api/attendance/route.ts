import { NextRequest, NextResponse } from "next/server";
import {
  createAttendancePunch,
  getAttendanceStatus,
} from "@/lib/db/repository";
import { withPermission } from "@/lib/permissions/check";
import type { AttendancePunchType } from "@/lib/types";

export async function GET(request: NextRequest) {
  return withPermission(request, "attendance_register", async ({ session }) => {
    const workDate = request.nextUrl.searchParams.get("workDate") ?? undefined;
    try {
      const status = await getAttendanceStatus(
        session.tenantId,
        session.id,
        workDate
      );
      return NextResponse.json({ status });
    } catch (e) {
      const message = e instanceof Error ? e.message : "取得に失敗しました";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}

export async function POST(request: NextRequest) {
  return withPermission(request, "attendance_register", async ({ session }) => {
    try {
      const body = await request.json();
      const { punchType } = body as { punchType: AttendancePunchType };
      if (!punchType) {
        return NextResponse.json({ error: "punchType required" }, { status: 400 });
      }

      const status = await createAttendancePunch(
        session.tenantId,
        session.id,
        punchType,
        "pc"
      );
      return NextResponse.json({ status });
    } catch (e) {
      const message = e instanceof Error ? e.message : "打刻に失敗しました";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  });
}
