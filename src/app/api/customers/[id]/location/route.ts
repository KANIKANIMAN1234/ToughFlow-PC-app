import { NextRequest, NextResponse } from "next/server";

import { getUserAccessMap, updateCustomerLocation } from "@/lib/db/repository";
import {
  forbiddenResponse,
  getSessionFromRequest,
  unauthorizedResponse,
} from "@/lib/auth/session";
import { isAccessGranted } from "@/lib/permissions/access";

const LOCATION_EDIT_ROLES = new Set(["admin", "office"]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();

  if (!LOCATION_EDIT_ROLES.has(session.role)) {
    return forbiddenResponse();
  }

  try {
    const accessMap = await getUserAccessMap(
      session.tenantId,
      session.id,
      session.role
    );
    if (!isAccessGranted(accessMap.project_list_other ?? "deny")) {
      return forbiddenResponse();
    }

    const { id } = await params;
    const body = (await request.json()) as { lat?: unknown; lng?: unknown };
    const lat = Number(body.lat);
    const lng = Number(body.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: "緯度・経度が不正です" },
        { status: 400 }
      );
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: "緯度・経度の範囲が不正です" },
        { status: 400 }
      );
    }

    await updateCustomerLocation(session.tenantId, id, lat, lng);
    return NextResponse.json({ ok: true, lat, lng });
  } catch (e) {
    const message = e instanceof Error ? e.message : "保存に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
