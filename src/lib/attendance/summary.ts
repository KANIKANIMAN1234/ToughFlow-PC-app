import { toTotalMinutes } from "@/lib/employment/work-rule-defaults";
import { staffTypeUsesHourlyWage } from "@/lib/staff/constants";
import type {
  AttendanceHistoryEntry,
  AttendancePunch,
  EmploymentWorkRule,
  StaffType,
  TenantStaff,
} from "@/lib/types";

import { calculateWorkMinutes, formatHoursMinutes } from "./format";
import { resolveWorkRuleForStaff } from "./work-rule-resolve";

export type MonthlyWorkSummary = {
  userId: string;
  userName: string;
  staffCode: string;
  group: string;
  workMinutes: number;
  breakMinutes: number;
  overtimeMinutes: number;
  lateNightMinutes: number;
  estimatedPay: number | null;
  workTime: string;
  breakTime: string;
  overtimeTime: string;
  lateNightTime: string;
  estimatedPayDisplay: string;
};

type DayWork = {
  workDate: string;
  workMinutes: number;
  breakMinutes: number;
  lateNightMinutes: number;
};

const JST = "Asia/Tokyo";

function sortedPunches(punches: AttendancePunch[]): AttendancePunch[] {
  return [...punches].sort((a, b) => a.punchedAt.localeCompare(b.punchedAt));
}

export function calculateBreakMinutes(punches: AttendancePunch[]): number {
  const sorted = sortedPunches(punches);
  let total = 0;
  let breakStart: Date | null = null;

  for (const punch of sorted) {
    const at = new Date(punch.punchedAt);
    if (punch.punchType === "break_out") {
      breakStart = at;
    } else if (punch.punchType === "break_in" && breakStart) {
      total += (at.getTime() - breakStart.getTime()) / 60_000;
      breakStart = null;
    }
  }

  return Math.max(0, Math.floor(total));
}

function getWorkSegments(
  punches: AttendancePunch[]
): { start: Date; end: Date }[] {
  const sorted = sortedPunches(punches);
  const segments: { start: Date; end: Date }[] = [];
  let segmentStart: Date | null = null;

  for (const punch of sorted) {
    const at = new Date(punch.punchedAt);
    switch (punch.punchType) {
      case "clock_in":
      case "break_in":
        segmentStart = at;
        break;
      case "break_out":
      case "clock_out":
        if (segmentStart) {
          segments.push({ start: segmentStart, end: at });
          segmentStart = null;
        }
        break;
    }
  }

  return segments;
}

function minutesOfDayJst(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: JST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

function workDateJst(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: JST }).format(date);
}

function overlapMinutes(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  const start = Math.max(aStart, bStart);
  const end = Math.min(aEnd, bEnd);
  return Math.max(0, end - start);
}

function lateNightMinutesForSegment(
  start: Date,
  end: Date,
  rule: EmploymentWorkRule
): number {
  if (end <= start) return 0;

  const nightStart = toTotalMinutes(
    rule.lateNightStartHour,
    rule.lateNightStartMinute
  );
  const nightEnd = toTotalMinutes(
    rule.lateNightEndHour,
    rule.lateNightEndMinute
  );
  const earlyEnd = rule.includeEarlyMorningInLateNight
    ? nightEnd - 24 * 60
    : 0;

  let total = 0;
  let cursor = new Date(start);

  while (cursor < end) {
    const dayStart = new Date(cursor);
    const dayKey = workDateJst(dayStart);
    const nextDay = new Date(`${dayKey}T12:00:00`);
    nextDay.setDate(nextDay.getDate() + 1);
    const dayEnd = new Date(Math.min(nextDay.getTime(), end.getTime()));

    const segStartMin = minutesOfDayJst(cursor);
    const segEndMin =
      workDateJst(dayEnd) === dayKey
        ? minutesOfDayJst(dayEnd)
        : 24 * 60;

    total += overlapMinutes(segStartMin, segEndMin, nightStart, 24 * 60);
    if (earlyEnd > 0) {
      total += overlapMinutes(segStartMin, segEndMin, 0, earlyEnd);
    }

    cursor = dayEnd;
  }

  return Math.max(0, Math.floor(total));
}

export function calculateLateNightMinutes(
  punches: AttendancePunch[],
  rule: EmploymentWorkRule
): number {
  return getWorkSegments(punches).reduce(
    (sum, segment) =>
      sum + lateNightMinutesForSegment(segment.start, segment.end, rule),
    0
  );
}

function dayThresholdMinutes(rule: EmploymentWorkRule): number {
  return toTotalMinutes(
    rule.overtimeDayThresholdHours,
    rule.overtimeDayThresholdMinutes
  );
}

function weekThresholdMinutes(rule: EmploymentWorkRule): number {
  return toTotalMinutes(
    rule.overtimeWeekThresholdHours,
    rule.overtimeWeekThresholdMinutes
  );
}

function weekKey(workDate: string): string {
  const d = new Date(`${workDate}T12:00:00`);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  return d.toISOString().slice(0, 10);
}

function calculateOvertimeForDays(
  days: DayWork[],
  rule: EmploymentWorkRule
): number {
  if (!days.length) return 0;

  const dayThreshold = dayThresholdMinutes(rule);
  const weekThreshold = weekThresholdMinutes(rule);
  const calcType = rule.overtimeCalcType;

  const dailyOnly =
    calcType === "daily" ||
    calcType === "daily_by_weekday" ||
    calcType === "time_specified" ||
    calcType === "application";

  if (dailyOnly) {
    return days.reduce(
      (sum, day) => sum + Math.max(0, day.workMinutes - dayThreshold),
      0
    );
  }

  if (calcType === "weekly") {
    const byWeek = new Map<string, number>();
    for (const day of days) {
      const key = weekKey(day.workDate);
      byWeek.set(key, (byWeek.get(key) ?? 0) + day.workMinutes);
    }
    let total = 0;
    for (const weekWork of byWeek.values()) {
      total += Math.max(0, weekWork - weekThreshold);
    }
    return total;
  }

  const byWeek = new Map<string, DayWork[]>();
  for (const day of days) {
    const key = weekKey(day.workDate);
    const list = byWeek.get(key) ?? [];
    list.push(day);
    byWeek.set(key, list);
  }

  let total = 0;
  for (const weekDays of byWeek.values()) {
    const dailyOt = weekDays.reduce(
      (sum, day) => sum + Math.max(0, day.workMinutes - dayThreshold),
      0
    );
    const weekWork = weekDays.reduce((sum, day) => sum + day.workMinutes, 0);
    const weeklyOt = Math.max(0, weekWork - weekThreshold);
    total += Math.max(dailyOt, weeklyOt);
  }

  return total;
}

function formatPay(amount: number | null): string {
  if (amount == null) return "—";
  return `¥${Math.round(amount).toLocaleString("ja-JP")}`;
}

function calculateEstimatedPay(
  staff: Pick<TenantStaff, "staffType" | "hourlyWage">,
  workMinutes: number,
  overtimeMinutes: number,
  lateNightMinutes: number,
  rule: EmploymentWorkRule
): number | null {
  if (!staffTypeUsesHourlyWage(staff.staffType)) return null;
  const hourlyWage = staff.hourlyWage ?? 0;
  if (hourlyWage <= 0) return null;

  const regularMinutes = Math.max(0, workMinutes - overtimeMinutes);
  const base = (regularMinutes / 60) * hourlyWage;
  const overtimePremium =
    (overtimeMinutes / 60) * hourlyWage * (rule.overtimeRatePercent / 100);
  const lateNightPremium =
    (lateNightMinutes / 60) * hourlyWage * (rule.lateNightRatePercent / 100);

  return base + overtimePremium + lateNightPremium;
}

function groupEntriesByUserDay(entries: AttendanceHistoryEntry[]) {
  const map = new Map<string, Map<string, AttendancePunch[]>>();

  for (const entry of entries) {
    let userDays = map.get(entry.userId);
    if (!userDays) {
      userDays = new Map();
      map.set(entry.userId, userDays);
    }
    const dayPunches = userDays.get(entry.workDate) ?? [];
    dayPunches.push(entry);
    userDays.set(entry.workDate, dayPunches);
  }

  return map;
}

export function buildMonthlyWorkSummaries(
  staffList: TenantStaff[],
  entries: AttendanceHistoryEntry[],
  rules: EmploymentWorkRule[]
): MonthlyWorkSummary[] {
  const punchesByUserDay = groupEntriesByUserDay(entries);

  return staffList.map((staff) => {
    const rule = resolveWorkRuleForStaff(rules, staff.staffType);
    const userDays = punchesByUserDay.get(staff.id);

    const dayWorks: DayWork[] = [];
    let breakMinutes = 0;
    let lateNightMinutes = 0;
    let workMinutes = 0;

    if (userDays) {
      for (const [workDate, punches] of userDays) {
        const sorted = sortedPunches(punches);
        const dayWork = calculateWorkMinutes(sorted);
        const dayBreak = calculateBreakMinutes(sorted);
        const dayLateNight = calculateLateNightMinutes(sorted, rule);

        dayWorks.push({
          workDate,
          workMinutes: dayWork,
          breakMinutes: dayBreak,
          lateNightMinutes: dayLateNight,
        });
        workMinutes += dayWork;
        breakMinutes += dayBreak;
        lateNightMinutes += dayLateNight;
      }
    }

    const overtimeMinutes = calculateOvertimeForDays(dayWorks, rule);
    const estimatedPay = calculateEstimatedPay(
      staff,
      workMinutes,
      overtimeMinutes,
      lateNightMinutes,
      rule
    );

    return {
      userId: staff.id,
      userName: staff.name,
      staffCode: staff.staffCode ?? "—",
      group: "未所属",
      workMinutes,
      breakMinutes,
      overtimeMinutes,
      lateNightMinutes,
      estimatedPay,
      workTime: formatHoursMinutes(workMinutes),
      breakTime: formatHoursMinutes(breakMinutes),
      overtimeTime: formatHoursMinutes(overtimeMinutes),
      lateNightTime: formatHoursMinutes(lateNightMinutes),
      estimatedPayDisplay: formatPay(estimatedPay),
    };
  });
}
