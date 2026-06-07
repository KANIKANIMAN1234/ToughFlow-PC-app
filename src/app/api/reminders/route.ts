import { NextRequest, NextResponse } from "next/server";
import { getOfficeReminders } from "@/lib/db/repository";
import { requirePermission } from "@/lib/permissions/check";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "expense_approve");
  if (auth instanceof Response) return auth;

  try {
    const reminders = await getOfficeReminders(auth.session.tenantId);
    return NextResponse.json({ reminders });
  } catch (e) {
    const message = e instanceof Error ? e.message : "取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
