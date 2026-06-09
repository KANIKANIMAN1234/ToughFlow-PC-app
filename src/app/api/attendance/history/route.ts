import { NextRequest, NextResponse } from "next/server";

import {
  aggregateAttendanceDayRows,
} from "@/lib/attendance/history";
import {
  listAttendanceHistory,
} from "@/lib/db/repository";
import { isAccessGranted } from "@/lib/permissions/access";
import { withAnyPermission } from "@/lib/permissions/check";

export async function GET(request: NextRequest) {
  return withAnyPermission(
    request,
    ["attendance_register", "attendance_view_all"],
    async ({ session, accessMap }) => {
      const canViewAll = isAccessGranted(
        accessMap.attendance_view_all ?? "deny"
      );
      const fromDate =
        request.nextUrl.searchParams.get("fromDate") ?? undefined;
      const toDate = request.nextUrl.searchParams.get("toDate") ?? undefined;
      const requestedUserId =
        request.nextUrl.searchParams.get("userId") ?? undefined;

      const userId = canViewAll
        ? requestedUserId || undefined
        : session.id;

      try {
        const entries = await listAttendanceHistory(session.tenantId, {
          fromDate,
          toDate,
          userId,
        });

        return NextResponse.json({
          rows: aggregateAttendanceDayRows(entries),
          canViewAll,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "取得に失敗しました";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }
  );
}
