import type {
  AttendancePunch,
  AttendancePunchType,
  AttendanceState,
} from "@/lib/types";

const ALL_TYPES: AttendancePunchType[] = [
  "clock_in",
  "break_out",
  "break_in",
  "clock_out",
];

export function deriveAttendanceState(
  punches: AttendancePunch[]
): AttendanceState {
  if (punches.length === 0) return "idle";
  const last = punches[punches.length - 1];
  switch (last.punchType) {
    case "clock_in":
    case "break_in":
      return "working";
    case "break_out":
      return "on_break";
    case "clock_out":
      return "finished";
    default:
      return "idle";
  }
}

export function getAllowedPunchTypes(state: AttendanceState): AttendancePunchType[] {
  switch (state) {
    case "idle":
      return ["clock_in"];
    case "working":
      return ["break_out", "clock_out"];
    case "on_break":
      return ["break_in"];
    case "finished":
      return [];
    default:
      return [];
  }
}

export function canPunch(
  state: AttendanceState,
  punchType: AttendancePunchType
): boolean {
  return getAllowedPunchTypes(state).includes(punchType);
}

export function validatePunchTransition(
  punches: AttendancePunch[],
  punchType: AttendancePunchType
): string | null {
  const state = deriveAttendanceState(punches);
  if (!canPunch(state, punchType)) {
    const labels: Record<AttendancePunchType, string> = {
      clock_in: "出勤",
      break_out: "中抜け",
      break_in: "戻り",
      clock_out: "退勤",
    };
    return `現在の状態では「${labels[punchType]}」はできません`;
  }
  if (!ALL_TYPES.includes(punchType)) {
    return "不正な打刻種別です";
  }
  return null;
}

export function workDateJST(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
  }).format(date);
}
