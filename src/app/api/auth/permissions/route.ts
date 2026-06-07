import { NextRequest, NextResponse } from "next/server";
import { getUserAccessMap } from "@/lib/db/repository";
import { isAccessGranted, withDbSession } from "@/lib/permissions/check";

export async function GET(request: NextRequest) {
  return withDbSession(request, async (session) => {
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
  });
}
