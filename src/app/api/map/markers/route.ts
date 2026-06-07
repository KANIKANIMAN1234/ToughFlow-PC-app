import { NextRequest, NextResponse } from "next/server";

import { listMapMarkers } from "@/lib/db/repository";
import { withAnyPermission } from "@/lib/permissions/check";

export async function GET(request: NextRequest) {
  return withAnyPermission(request, ["project_list_other"], async ({ session }) => {
    try {
      const markers = await listMapMarkers(session.tenantId);
      return NextResponse.json({ markers });
    } catch (e) {
      const message = e instanceof Error ? e.message : "取得に失敗しました";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
