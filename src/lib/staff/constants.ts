import type { PrescribedWorkDaysType, StaffType } from "@/lib/types";

export const STAFF_TYPE_OPTIONS: { value: StaffType; label: string }[] = [
  { value: "unclassified", label: "未分類" },
  { value: "full_time", label: "正社員" },
  { value: "contract", label: "契約社員" },
  { value: "temporary", label: "派遣" },
  { value: "part_time", label: "パート・アルバイト" },
];

export const PRESCRIBED_WORK_DAYS_OPTIONS: {
  value: PrescribedWorkDaysType;
  label: string;
}[] = [
  { value: "unset", label: "未設定" },
  { value: "week", label: "週" },
  { value: "year", label: "1年間" },
];

export const WORK_HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => i);
export const WORK_MINUTE_OPTIONS = [0, 15, 30, 45];

const currentYear = new Date().getFullYear();

/** 生年月日の年プルダウン（新しい年から表示） */
export const BIRTH_YEAR_OPTIONS = Array.from(
  { length: currentYear - 1940 + 1 },
  (_, i) => currentYear - i
);

/** 入社日の年プルダウン（新しい年から表示、翌年まで選択可） */
export const JOIN_YEAR_OPTIONS = Array.from(
  { length: currentYear + 1 - 1980 + 1 },
  (_, i) => currentYear + 1 - i
);

export const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

export function daysInMonth(year: number, month: number): number {
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
}
