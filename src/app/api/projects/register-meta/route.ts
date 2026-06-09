import { NextRequest, NextResponse } from "next/server";

import {
  listAssignableUsers,
  listCustomerOptions,
} from "@/lib/db/repository";
import { withPermission } from "@/lib/permissions/check";

export async function GET(request: NextRequest) {
  return withPermission(request, "project_register", async ({ session }) => {
    try {
      const [customers, assignees] = await Promise.all([
        listCustomerOptions(session.tenantId),
        listAssignableUsers(session.tenantId),
      ]);
      return NextResponse.json({ customers, assignees });
    } catch (e) {
      const message = e instanceof Error ? e.message : "取得に失敗しました";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
