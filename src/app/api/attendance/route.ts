import { NextRequest, NextResponse } from "next/server";
import {
  createAttendancePunch,
  getAttendanceStatus,
} from "@/lib/db/repository";
import { requirePermission } from "@/lib/permissions/check";
import type { AttendancePunchType } from "@/lib/types";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "attendance_register");
  if (auth instanceof Response) return auth;

  const workDate = request.nextUrl.searchParams.get("workDate") ?? undefined;
  try {
    const status = await getAttendanceStatus(
      auth.session.tenantId,
      auth.session.id,
      workDate
    );
    return NextResponse.json({ status });
  } catch (e) {
    const message = e instanceof Error ? e.message : "取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "attendance_register");
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const { punchType } = body as { punchType: AttendancePunchType };
    if (!punchType) {
      return NextResponse.json({ error: "punchType required" }, { status: 400 });
    }

    const status = await createAttendancePunch(
      auth.session.tenantId,
      auth.session.id,
      punchType,
      "pc"
    );
    return NextResponse.json({ status });
  } catch (e) {
    const message = e instanceof Error ? e.message : "打刻に失敗しました";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
