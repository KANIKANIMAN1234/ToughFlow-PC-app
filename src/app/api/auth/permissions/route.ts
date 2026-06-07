import { NextRequest, NextResponse } from "next/server";
import { getUserAccessMap } from "@/lib/db/repository";
import {
  getSessionFromRequest,
  unauthorizedResponse,
} from "@/lib/auth/session";
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
    const granted = Object.entries(accessMap)
      .filter(([, level]) => isAccessGranted(level))
      .map(([code]) => code);
    return NextResponse.json({ accessMap, granted });
  } catch (e) {
    const message = e instanceof Error ? e.message : "取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
