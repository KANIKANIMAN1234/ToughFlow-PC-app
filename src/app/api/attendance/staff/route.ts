import { NextRequest, NextResponse } from "next/server";

import type { AttendanceStaffOption } from "@/lib/attendance/history";
import { listTenantStaff } from "@/lib/db/repository";
import { isAccessGranted } from "@/lib/permissions/access";
import { withAnyPermission } from "@/lib/permissions/check";

export async function GET(request: NextRequest) {
  return withAnyPermission(
    request,
    ["attendance_register", "attendance_view_all"],
    async ({ session, accessMap }) => {
      try {
        const canViewAll = isAccessGranted(
          accessMap.attendance_view_all ?? "deny"
        );

        let staff: AttendanceStaffOption[] = [];
        if (canViewAll) {
          const tenantStaff = await listTenantStaff(session.tenantId);
          staff = tenantStaff.map((s) => ({
            id: s.id,
            name: s.name,
            staffCode: s.staffCode,
            staffType: s.staffType,
          }));
        } else {
          staff = [{ id: session.id, name: session.name }];
        }

        return NextResponse.json({ staff, canViewAll });
      } catch (e) {
        const message = e instanceof Error ? e.message : "取得に失敗しました";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }
  );
}
