import type {
  EmploymentOvertimeCalcType,
  EmploymentScheduledCalcType,
  StaffType,
} from "@/lib/types";
import { STAFF_TYPE_OPTIONS } from "@/lib/staff/constants";

export const SCHEDULED_CALC_OPTIONS: {
  value: EmploymentScheduledCalcType;
  label: string;
}[] = [{ value: "daily", label: "日計算" }];

export const OVERTIME_CALC_OPTIONS: {
  value: EmploymentOvertimeCalcType;
  label: string;
}[] = [{ value: "greater_of_day_or_week", label: "日または週(多い方)" }];

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
