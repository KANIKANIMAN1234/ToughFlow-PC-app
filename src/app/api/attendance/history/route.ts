import { NextRequest, NextResponse } from "next/server";

import { listAttendanceHistory } from "@/lib/db/repository";
import { isAccessGranted } from "@/lib/permissions/access";
import { withAnyPermission } from "@/lib/permissions/check";
import { createAdminClient } from "@/lib/supabase/admin";

async function listActiveUsers(tenantId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("m_user")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
  }));
}

export async function GET(request: NextRequest) {
  return withAnyPermission(
    request,
    ["attendance_register", "attendance_view_all"],
    async ({ session, accessMap }) => {
      try {
        const canViewAll = isAccessGranted(
          accessMap.attendance_view_all ?? "deny"
        );

        const params = request.nextUrl.searchParams;
        const fromDate = params.get("fromDate") ?? undefined;
        const toDate = params.get("toDate") ?? undefined;
        const requestedUserId = params.get("userId") ?? undefined;

        const userId = canViewAll ? requestedUserId : session.id;

        const punches = await listAttendanceHistory(session.tenantId, {
          userId,
          fromDate,
          toDate,
        });

        const users = canViewAll
          ? await listActiveUsers(session.tenantId)
          : undefined;

        return NextResponse.json({
          punches,
          canViewAll,
          users,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "取得に失敗しました";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }
  );
}
