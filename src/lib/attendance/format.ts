import type { AttendancePunch, AttendancePunchType } from "@/lib/types";

const JST = "Asia/Tokyo";

export function formatPunchTime(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: JST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function formatWorkDateJa(workDate: string): string {
  const d = new Date(`${workDate}T12:00:00`);
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 (${weekday})`;
}

export function formatDurationMinutes(minutes: number): string {
  if (minutes <= 0) return "0分";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}分`;
  if (mins === 0) return `${hours}時間`;
  return `${hours}時間${mins}分`;
}

export function formatDurationHm(hours: number, minutes: number): string {
  return formatDurationMinutes(hours * 60 + minutes);
}

/** HH:MM 形式（法定外労働集計用） */
export function formatHoursMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function calculateWorkMinutes(punches: AttendancePunch[]): number {
  let total = 0;
  let segmentStart: Date | null = null;

  for (const punch of punches) {
    const at = new Date(punch.punchedAt);
    switch (punch.punchType) {
      case "clock_in":
      case "break_in":
        segmentStart = at;
        break;
      case "break_out":
      case "clock_out":
        if (segmentStart) {
          total += (at.getTime() - segmentStart.getTime()) / 60_000;
          segmentStart = null;
        }
        break;
    }
  }

  return Math.max(0, Math.floor(total));
}

export function formatBreakPeriods(
  punches: AttendancePunch[]
): string {
  const sorted = [...punches].sort((a, b) =>
    a.punchedAt.localeCompare(b.punchedAt)
  );
  const periods: string[] = [];
  let breakStart: string | null = null;

  for (const punch of sorted) {
    if (punch.punchType === "break_out") {
      breakStart = punch.punchedAt;
    } else if (punch.punchType === "break_in" && breakStart) {
      periods.push(
        `${formatPunchTime(breakStart)}〜${formatPunchTime(punch.punchedAt)}`
      );
      breakStart = null;
    }
  }

  if (breakStart) {
    periods.push(formatPunchTime(breakStart));
  }

  return periods.join("、") || "—";
}

export function getFirstPunchTime(
  punches: AttendancePunch[],
  type: AttendancePunchType
): string | null {
  const found = punches.find((p) => p.punchType === type);
  return found ? formatPunchTime(found.punchedAt) : null;
}

export function getLastPunchTime(
  punches: AttendancePunch[],
  type: AttendancePunchType
): string | null {
  const found = [...punches].reverse().find((p) => p.punchType === type);
  return found ? formatPunchTime(found.punchedAt) : null;
}
