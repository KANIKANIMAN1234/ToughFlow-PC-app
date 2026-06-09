import type { AttendanceHistoryEntry } from "@/lib/types";
import { formatTime } from "@/lib/utils";

export type AttendanceDayRow = {
  workDate: string;
  userId: string;
  userName: string;
  clockIn?: string;
  clockOut?: string;
  breaks: string;
};

function formatBreakPair(outAt: string, inAt?: string): string {
  const out = formatTime(outAt);
  if (!inAt) return `${out}〜`;
  return `${out}〜${formatTime(inAt)}`;
}

export function groupAttendanceByDay(
  entries: AttendanceHistoryEntry[]
): AttendanceDayRow[] {
  const map = new Map<
    string,
    AttendanceDayRow & { punches: AttendanceHistoryEntry[] }
  >();

  for (const entry of entries) {
    const key = `${entry.userId}-${entry.workDate}`;
    let group = map.get(key);
    if (!group) {
      group = {
        workDate: entry.workDate,
        userId: entry.userId,
        userName: entry.userName,
        breaks: "",
        punches: [],
      };
      map.set(key, group);
    }
    group.punches.push(entry);
    if (entry.userName) group.userName = entry.userName;
  }

  const rows: AttendanceDayRow[] = [];

  for (const group of map.values()) {
    group.punches.sort((a, b) => a.punchedAt.localeCompare(b.punchedAt));

    const clockIn = group.punches.find((p) => p.punchType === "clock_in");
    const clockOut = [...group.punches]
      .reverse()
      .find((p) => p.punchType === "clock_out");

    const breakPairs: string[] = [];
    let pendingBreakOut: string | undefined;
    for (const punch of group.punches) {
      if (punch.punchType === "break_out") {
        pendingBreakOut = punch.punchedAt;
      } else if (punch.punchType === "break_in" && pendingBreakOut) {
        breakPairs.push(formatBreakPair(pendingBreakOut, punch.punchedAt));
        pendingBreakOut = undefined;
      }
    }
    if (pendingBreakOut) {
      breakPairs.push(formatBreakPair(pendingBreakOut));
    }

    rows.push({
      workDate: group.workDate,
      userId: group.userId,
      userName: group.userName,
      clockIn: clockIn ? formatTime(clockIn.punchedAt) : undefined,
      clockOut: clockOut ? formatTime(clockOut.punchedAt) : undefined,
      breaks: breakPairs.join(" / "),
    });
  }

  rows.sort((a, b) => {
    const dateCmp = b.workDate.localeCompare(a.workDate);
    if (dateCmp !== 0) return dateCmp;
    return a.userName.localeCompare(b.userName, "ja");
  });

  return rows;
}
