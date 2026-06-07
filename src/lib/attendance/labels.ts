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
    enabled: "bg-emerald-600 text-white hover:bg-emerald-700",
    disabled: "bg-emerald-50 text-emerald-300",
  },
  break_out: {
    enabled: "bg-amber-500 text-white hover:bg-amber-600",
    disabled: "bg-amber-50 text-amber-300",
  },
  break_in: {
    enabled: "bg-sky-600 text-white hover:bg-sky-700",
    disabled: "bg-sky-50 text-sky-300",
  },
  clock_out: {
    enabled: "bg-slate-600 text-white hover:bg-slate-700",
    disabled: "bg-slate-100 text-slate-300",
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
