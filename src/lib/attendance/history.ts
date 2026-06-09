import type { AttendanceHistoryEntry, AttendancePunch, StaffType } from "@/lib/types";

import {
  formatBreakPeriods,
  getFirstPunchTime,
  getLastPunchTime,
} from "./format";

export type AttendanceDayRow = {
  workDate: string;
  userId: string;
  userName: string;
  clockIn: string | null;
  clockOut: string | null;
  breaks: string;
};

export type AttendanceStaffOption = {
  id: string;
  name: string;
  staffCode?: string;
  staffType?: StaffType;
};

function groupKey(workDate: string, userId: string): string {
  return `${workDate}:${userId}`;
}

export function aggregateAttendanceDayRows(
  entries: AttendanceHistoryEntry[]
): AttendanceDayRow[] {
  const groups = new Map<
    string,
    { userName: string; punches: AttendancePunch[] }
  >();

  for (const entry of entries) {
    const key = groupKey(entry.workDate, entry.userId);
    const existing = groups.get(key);
    if (existing) {
      existing.punches.push(entry);
    } else {
      groups.set(key, { userName: entry.userName, punches: [entry] });
    }
  }

  const rows: AttendanceDayRow[] = [];

  for (const [key, { userName, punches }] of groups) {
    const [workDate, userId] = key.split(":");
    const sorted = [...punches].sort((a, b) =>
      a.punchedAt.localeCompare(b.punchedAt)
    );

    rows.push({
      workDate,
      userId,
      userName,
      clockIn: getFirstPunchTime(sorted, "clock_in"),
      clockOut: getLastPunchTime(sorted, "clock_out"),
      breaks: formatBreakPeriods(sorted),
    });
  }

  return rows.sort((a, b) => {
    const dateCmp = b.workDate.localeCompare(a.workDate);
    if (dateCmp !== 0) return dateCmp;
    return a.userName.localeCompare(b.userName, "ja");
  });
}

export function extractStaffOptions(
  entries: AttendanceHistoryEntry[]
): AttendanceStaffOption[] {
  const map = new Map<string, AttendanceStaffOption>();
  for (const entry of entries) {
    if (!map.has(entry.userId)) {
      map.set(entry.userId, { id: entry.userId, name: entry.userName });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "ja"));
}
