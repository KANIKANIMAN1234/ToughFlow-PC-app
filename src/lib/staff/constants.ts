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
