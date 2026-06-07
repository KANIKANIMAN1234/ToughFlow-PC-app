import { NextRequest, NextResponse } from "next/server";
import { getOfficeReminders } from "@/lib/db/repository";
import { withPermission } from "@/lib/permissions/check";

export async function GET(request: NextRequest) {
  return withPermission(request, "expense_approve", async ({ session }) => {
    try {
      const reminders = await getOfficeReminders(session.tenantId);
      return NextResponse.json({ reminders });
    } catch (e) {
      const message = e instanceof Error ? e.message : "取得に失敗しました";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
