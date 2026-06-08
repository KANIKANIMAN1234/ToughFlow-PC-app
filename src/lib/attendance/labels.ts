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

/** 打刻ボタン色（有効 / 無効） */
export const PUNCH_BUTTON_STYLES: Record<
  AttendancePunchType,
  { enabled: string; disabled: string }
> = {
  clock_in: {
    enabled:
      "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
    disabled:
      "border-2 border-emerald-400 bg-emerald-50 text-emerald-800",
  },
  break_out: {
    enabled:
      "bg-amber-500 text-white shadow-sm hover:bg-amber-600",
    disabled:
      "border-2 border-amber-400 bg-amber-50 text-amber-900",
  },
  break_in: {
    enabled:
      "bg-sky-600 text-white shadow-sm hover:bg-sky-700",
    disabled:
      "border-2 border-sky-400 bg-sky-50 text-sky-900",
  },
  clock_out: {
    enabled:
      "bg-slate-700 text-white shadow-sm hover:bg-slate-800",
    disabled:
      "border-2 border-slate-400 bg-slate-100 text-slate-800",
  },
};

export function getPunchButtonClassName(
  type: AttendancePunchType,
  enabled: boolean
): string {
  return enabled
    ? PUNCH_BUTTON_STYLES[type].enabled
    : PUNCH_BUTTON_STYLES[type].disabled;
}
