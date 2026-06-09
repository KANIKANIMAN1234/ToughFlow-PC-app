import { NextRequest, NextResponse } from "next/server";

import { listCustomers } from "@/lib/db/repository";
import { withPermission } from "@/lib/permissions/check";

export async function GET(request: NextRequest) {
  return withPermission(request, "project_list_other", async ({ session }) => {
    try {
      const customers = await listCustomers(session.tenantId);
      return NextResponse.json({ customers });
    } catch (e) {
      const message = e instanceof Error ? e.message : "取得に失敗しました";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
