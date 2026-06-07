import { NextRequest, NextResponse } from "next/server";

import {
  getSessionFromRequest,
  unauthorizedResponse,
} from "@/lib/auth/session";
import { getUserAccessMap } from "@/lib/db/repository";
import { listGoogleCalendarEvents } from "@/lib/google/calendar";
import {
  getCalendarId,
  getCalendarSetupHint,
  getServiceAccountEmail,
  isCalendarConfigured,
  parseServiceAccountJson,
} from "@/lib/google/client";
import { isAccessGranted } from "@/lib/permissions/access";

/** 管理者向け: Google Calendar 連携の診断（本番トラブルシュート用） */
export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();

  if (session.role !== "admin") {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const accessMap = await getUserAccessMap(
    session.tenantId,
    session.id,
    session.role
  );
  if (!isAccessGranted(accessMap.dispatch_list_view ?? "deny")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const today = new Date();
  const from = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const to = from;

  const status = {
    configured: isCalendarConfigured(),
    calendarId: getCalendarId(),
    serviceAccountEmail: getServiceAccountEmail(),
    jsonParseOk: Boolean(parseServiceAccountJson()),
    hint: getCalendarSetupHint(),
    eventCount: null as number | null,
    error: null as string | null,
  };

  try {
    const events = await listGoogleCalendarEvents(from, to);
    status.eventCount = events.length;
  } catch (e) {
    status.error = e instanceof Error ? e.message : "取得に失敗しました";
  }

  return NextResponse.json(status);
}
