import { NextRequest, NextResponse } from "next/server";

import {
  forbiddenResponse,
  getSessionFromRequest,
  unauthorizedResponse,
} from "@/lib/auth/session";
import { getUserAccessMap } from "@/lib/db/repository";
import { listGoogleCalendarEvents } from "@/lib/google/calendar";
import { isAccessGranted } from "@/lib/permissions/access";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();

  const from = request.nextUrl.searchParams.get("from")?.trim();
  const to = request.nextUrl.searchParams.get("to")?.trim();

  if (!from || !to) {
    return NextResponse.json(
      { error: "from と to パラメータが必要です" },
      { status: 400 }
    );
  }

  try {
    const accessMap = await getUserAccessMap(
      session.tenantId,
      session.id,
      session.role
    );
    const allowed =
      isAccessGranted(accessMap.dispatch_list_view ?? "deny") ||
      isAccessGranted(accessMap.dispatch_view ?? "deny");
    if (!allowed) return forbiddenResponse();

    const events = await listGoogleCalendarEvents(from, to);
    return NextResponse.json({ events });
  } catch (e) {
    const message = e instanceof Error ? e.message : "取得に失敗しました";
    const status = message.includes("未設定") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
