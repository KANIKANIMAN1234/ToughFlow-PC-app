import {
  calendarMonthsInRange,
  evaluationWorkDate,
  fiscalYearRangeUpTo,
  monthRangeUpTo,
  recentMonthRanges,
  weekRangeUpTo,
} from "@/lib/attendance/agreement-36-dates";
import { formatHoursMinutes } from "@/lib/attendance/format";
import { buildMonthlyWorkSummaries } from "@/lib/attendance/summary";
import { currentFiscalYear } from "@/lib/employment/agreement-36-defaults";
import {
  getAgreement36Settings,
  listAttendanceHistory,
  listEmploymentWorkRules,
  listTenantStaff,
} from "@/lib/db/repository";
import type {
  Agreement36Fiscal,
  Agreement36Global,
  AttendanceHistoryEntry,
  EmploymentWorkRule,
  TenantStaff,
} from "@/lib/types";

export type Agreement36AlertKind =
  | "daily"
  | "weekly"
  | "monthly"
  | "avg_2_6"
  | "yearly"
  | "exceed_count";

export type Agreement36Alert = {
  kind: Agreement36AlertKind;
  userId: string;
  userName: string;
  label: string;
  threshold: number;
  actual: number;
  unit: "hours" | "count";
};

function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

function filterEntries(
  entries: AttendanceHistoryEntry[],
  fromDate: string,
  toDate: string
): AttendanceHistoryEntry[] {
  return entries.filter(
    (entry) => entry.workDate >= fromDate && entry.workDate <= toDate
  );
}

function overtimeMinutesForStaff(
  staff: TenantStaff,
  entries: AttendanceHistoryEntry[],
  rules: EmploymentWorkRule[]
): number {
  const summaries = buildMonthlyWorkSummaries([staff], entries, rules);
  return summaries[0]?.overtimeMinutes ?? 0;
}

function pushAlert(
  alerts: Agreement36Alert[],
  partial: Omit<Agreement36Alert, "userId" | "userName"> & {
    userId: string;
    userName: string;
  }
) {
  if (partial.actual < partial.threshold) return;
  alerts.push(partial);
}

export async function evaluateAgreement36Alerts(
  tenantId: string,
  referenceDate = new Date()
): Promise<{
  enabled: boolean;
  workDate: string;
  global: Agreement36Global;
  fiscal: Agreement36Fiscal;
  alerts: Agreement36Alert[];
}> {
  const workDate = evaluationWorkDate(referenceDate);
  const preliminary = await getAgreement36Settings(
    tenantId,
    currentFiscalYear()
  );
  const fiscalYear = currentFiscalYear(preliminary.global.startMonth);
  const { global, fiscal } =
    preliminary.fiscal.fiscalYear === fiscalYear
      ? preliminary
      : await getAgreement36Settings(tenantId, fiscalYear);

  if (!global.isEnabled) {
    return { enabled: false, workDate, global, fiscal, alerts: [] };
  }

  const [staffList, rules] = await Promise.all([
    listTenantStaff(tenantId),
    listEmploymentWorkRules(tenantId),
  ]);

  const fiscalRange = fiscalYearRangeUpTo(
    fiscalYear,
    global.startMonth,
    global.startDay,
    workDate
  );
  const historyFrom = [
    fiscalRange.fromDate,
    recentMonthRanges(workDate, 6)[0]?.fromDate,
    workDate,
  ]
    .filter(Boolean)
    .sort()[0];

  const entries = await listAttendanceHistory(tenantId, {
    fromDate: historyFrom,
    toDate: workDate,
    limit: 50_000,
  });

  const alerts: Agreement36Alert[] = [];

  for (const staff of staffList) {
    if (fiscal.alertDailyEnabled) {
      const minutes = overtimeMinutesForStaff(
        staff,
        filterEntries(entries, workDate, workDate),
        rules
      );
      pushAlert(alerts, {
        kind: "daily",
        userId: staff.id,
        userName: staff.name,
        label: "1日の法定外労働",
        threshold: fiscal.alertDailyHours,
        actual: minutesToHours(minutes),
        unit: "hours",
      });
    }

    if (fiscal.alertWeeklyEnabled) {
      const range = weekRangeUpTo(workDate);
      const minutes = overtimeMinutesForStaff(
        staff,
        filterEntries(entries, range.fromDate, range.toDate),
        rules
      );
      pushAlert(alerts, {
        kind: "weekly",
        userId: staff.id,
        userName: staff.name,
        label: "1週の法定外労働及び休日労働",
        threshold: fiscal.alertWeeklyHours,
        actual: minutesToHours(minutes),
        unit: "hours",
      });
    }

    if (fiscal.alertMonthlyEnabled) {
      const range = monthRangeUpTo(workDate);
      const minutes = overtimeMinutesForStaff(
        staff,
        filterEntries(entries, range.fromDate, range.toDate),
        rules
      );
      pushAlert(alerts, {
        kind: "monthly",
        userId: staff.id,
        userName: staff.name,
        label: "1か月の法定外労働及び休日労働",
        threshold: fiscal.alertMonthlyHours,
        actual: minutesToHours(minutes),
        unit: "hours",
      });
    }

    if (fiscal.alertAvg26Enabled) {
      const monthRanges = recentMonthRanges(workDate, 6).slice(1);
      if (monthRanges.length >= 2) {
        const hoursList = monthRanges.map((range) =>
          minutesToHours(
            overtimeMinutesForStaff(
              staff,
              filterEntries(entries, range.fromDate, range.toDate),
              rules
            )
          )
        );
        const avg =
          Math.round(
            (hoursList.reduce((sum, value) => sum + value, 0) / hoursList.length) *
              100
          ) / 100;
        pushAlert(alerts, {
          kind: "avg_2_6",
          userId: staff.id,
          userName: staff.name,
          label: "2～6か月の法定外労働及び休日労働の平均",
          threshold: fiscal.alertAvg26Hours,
          actual: avg,
          unit: "hours",
        });
      }
    }

    if (fiscal.alertYearlyEnabled) {
      const minutes = overtimeMinutesForStaff(
        staff,
        filterEntries(entries, fiscalRange.fromDate, fiscalRange.toDate),
        rules
      );
      pushAlert(alerts, {
        kind: "yearly",
        userId: staff.id,
        userName: staff.name,
        label: "1年の法定外労働",
        threshold: fiscal.alertYearlyHours,
        actual: minutesToHours(minutes),
        unit: "hours",
      });
    }

    if (fiscal.alertExceedCountEnabled) {
      const months = calendarMonthsInRange(
        fiscalRange.fromDate,
        fiscalRange.toDate
      );
      let exceedCount = 0;
      for (const range of months) {
        const minutes = overtimeMinutesForStaff(
          staff,
          filterEntries(entries, range.fromDate, range.toDate),
          rules
        );
        if (minutesToHours(minutes) >= fiscal.specialMonthlyHours) {
          exceedCount += 1;
        }
      }
      pushAlert(alerts, {
        kind: "exceed_count",
        userId: staff.id,
        userName: staff.name,
        label: "限度時間を超えて労働させた回数",
        threshold: fiscal.alertExceedCount,
        actual: exceedCount,
        unit: "count",
      });
    }
  }

  return { enabled: true, workDate, global, fiscal, alerts };
}

export function formatAgreement36AlertMessage(alert: Agreement36Alert): string {
  const actualText =
    alert.unit === "hours"
      ? `${alert.actual}時間（${formatHoursMinutes(Math.round(alert.actual * 60))}）`
      : `${alert.actual}回`;
  const thresholdText =
    alert.unit === "hours" ? `${alert.threshold}時間` : `${alert.threshold}回`;

  return [
    "【36協定アラート】",
    `${alert.userName}さんの${alert.label}が基準を超えました。`,
    `基準: ${thresholdText}`,
    `実績: ${actualText}`,
  ].join("\n");
}
