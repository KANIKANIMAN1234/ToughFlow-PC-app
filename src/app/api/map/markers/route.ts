import { NextRequest, NextResponse } from "next/server";

import {
  getSessionFromRequest,
  forbiddenResponse,
  unauthorizedResponse,
} from "@/lib/auth/session";
import { listMapMarkers, getUserAccessMap } from "@/lib/db/repository";
import { isAccessGranted } from "@/lib/permissions/access";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();

  try {
    const accessMap = await getUserAccessMap(
      session.tenantId,
      session.id,
      session.role
    );
    if (!isAccessGranted(accessMap.project_list_other ?? "deny")) {
      return forbiddenResponse();
    }

    const markers = await listMapMarkers(session.tenantId);
    return NextResponse.json({ markers });
  } catch (e) {
    const message = e instanceof Error ? e.message : "取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
