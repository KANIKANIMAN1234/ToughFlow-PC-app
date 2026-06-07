import type { AttendancePunchType } from "@/lib/types";

export const PUNCH_LABELS: Record<AttendancePunchType, string> = {
  clock_in: "出勤",
  break_out: "中抜け",
  break_in: "戻り",
  clock_out: "退勤",
};

export const PUNCH_BUTTONS: { type: AttendancePunchType; label: string }[] = [
  { type: "clock_in", label: "出勤" },
  { type: "break_out", label: "中抜け" },
  { type: "break_in", label: "戻り" },
  { type: "clock_out", label: "退勤" },
];
