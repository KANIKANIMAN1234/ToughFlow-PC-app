import { NextRequest, NextResponse } from "next/server";

import { buildMonthlyWorkSummaries } from "@/lib/attendance/summary";
import {
  listAttendanceHistory,
  listEmploymentWorkRules,
  listTenantStaff,
} from "@/lib/db/repository";
import { isAccessGranted } from "@/lib/permissions/access";
import { withAnyPermission } from "@/lib/permissions/check";

function monthRange(year: number, month: number) {
  const mm = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return {
    fromDate: `${year}-${mm}-01`,
    toDate: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

export async function GET(request: NextRequest) {
  return withAnyPermission(
    request,
    ["attendance_register", "attendance_view_all"],
    async ({ session, accessMap }) => {
      const canViewAll = isAccessGranted(
        accessMap.attendance_view_all ?? "deny"
      );
      const year = Number(request.nextUrl.searchParams.get("year"));
      const month = Number(request.nextUrl.searchParams.get("month"));

      if (!year || month < 1 || month > 12) {
        return NextResponse.json(
          { error: "year と month を指定してください" },
          { status: 400 }
        );
      }

      const { fromDate, toDate } = monthRange(year, month);

      try {
        const [allStaff, entries, rules] = await Promise.all([
          listTenantStaff(session.tenantId),
          listAttendanceHistory(session.tenantId, {
            fromDate,
            toDate,
            limit: 20_000,
          }),
          listEmploymentWorkRules(session.tenantId),
        ]);

        const staffList = canViewAll
          ? allStaff
          : allStaff.filter((s) => s.id === session.id);

        const summaries = buildMonthlyWorkSummaries(
          staffList,
          entries.filter((e) =>
            staffList.some((staff) => staff.id === e.userId)
          ),
          rules
        );

        return NextResponse.json({ summaries, canViewAll, year, month });
      } catch (e) {
        const message = e instanceof Error ? e.message : "取得に失敗しました";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }
  );
}
