import { NextRequest, NextResponse } from "next/server";

import {
  forbiddenResponse,
  getSessionFromRequest,
  unauthorizedResponse,
} from "@/lib/auth/session";
import {
  createAttendancePunch,
  getAttendanceStatus,
  getUserAccessMap,
} from "@/lib/db/repository";
import { isAccessGranted } from "@/lib/permissions/access";
import type { AttendancePunchType } from "@/lib/types";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();

  const workDate = request.nextUrl.searchParams.get("workDate") ?? undefined;

  try {
    const accessMap = await getUserAccessMap(
      session.tenantId,
      session.id,
      session.role
    );
    if (!isAccessGranted(accessMap.attendance_register ?? "deny")) {
      return forbiddenResponse();
    }

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
}

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();

  try {
    const accessMap = await getUserAccessMap(
      session.tenantId,
      session.id,
      session.role
    );
    if (!isAccessGranted(accessMap.attendance_register ?? "deny")) {
      return forbiddenResponse();
    }

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
}
