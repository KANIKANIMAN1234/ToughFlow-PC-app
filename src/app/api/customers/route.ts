import { NextRequest, NextResponse } from "next/server";

import { getUserAccessMap, listCustomers } from "@/lib/db/repository";
import {
  forbiddenResponse,
  getSessionFromRequest,
  unauthorizedResponse,
} from "@/lib/auth/session";
import { isAccessGranted } from "@/lib/permissions/access";

/** 地図 API と同様、admin 取得のため JWT コンテキストは不要 */
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

    const customers = await listCustomers(session.tenantId);
    return NextResponse.json({ customers });
  } catch (e) {
    const message = e instanceof Error ? e.message : "取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
