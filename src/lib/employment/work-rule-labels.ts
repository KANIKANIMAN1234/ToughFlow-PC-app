import type {
  EmploymentOvertimeCalcTypeMaster,
  EmploymentScheduledCalcType,
  StaffType,
} from "@/lib/types";
import { STAFF_TYPE_OPTIONS } from "@/lib/staff/constants";

/** 所定労働時間の計算区分（コード定義・DBマスタ不要） */
export const SCHEDULED_CALC_OPTIONS: {
  value: EmploymentScheduledCalcType;
  label: string;
}[] = [
  { value: "daily", label: "日計算" },
  { value: "weekly", label: "週計算" },
  { value: "monthly", label: "月計算" },
  { value: "yearly", label: "年計算" },
  { value: "shift", label: "シフト時間" },
];

export function scheduledCalcTypeLabel(
  value: EmploymentScheduledCalcType
): string {
  return (
    SCHEDULED_CALC_OPTIONS.find((opt) => opt.value === value)?.label ?? value
  );
}

export function overtimeCalcTypeOptions(
  masters: EmploymentOvertimeCalcTypeMaster[]
): { value: string; label: string }[] {
  return masters.map((item) => ({ value: item.code, label: item.name }));
}

export function overtimeCalcTypeLabel(
  code: string,
  masters: EmploymentOvertimeCalcTypeMaster[]
): string {
  return masters.find((item) => item.code === code)?.name ?? code;
}

export const GROUP_OPTIONS = [{ value: "", label: "全て" }];

export function staffTypeFilterLabel(value: StaffType | null | undefined): string {
  if (!value) return "全て";
  return STAFF_TYPE_OPTIONS.find((opt) => opt.value === value)?.label ?? value;
}

export function groupFilterLabel(value: string): string {
  return GROUP_OPTIONS.find((opt) => opt.value === value)?.label ?? "全て";
}

export function workRuleScopeLabel(groupKey: string, staffType: StaffType | null) {
  return `${groupFilterLabel(groupKey)} / ${staffTypeFilterLabel(staffType)}`;
}
