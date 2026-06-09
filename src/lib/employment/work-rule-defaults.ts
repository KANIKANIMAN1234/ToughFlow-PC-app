import type { EmploymentWorkRuleInput } from "@/lib/types";

export const DEFAULT_EMPLOYMENT_WORK_RULE: EmploymentWorkRuleInput = {
  groupKey: "",
  staffType: null,
  scheduledCalcType: "daily",
  scheduledLimitHours: 8,
  scheduledLimitMinutes: 0,
  overtimeRatePercent: 25,
  overtimeCalcType: "greater_of_day_or_week",
  overtimeDayThresholdHours: 8,
  overtimeDayThresholdMinutes: 0,
  overtimeWeekThresholdHours: 40,
  overtimeWeekThresholdMinutes: 0,
  deemedOvertimeEnabled: false,
  deemedOvertimeHours: 0,
  deemedOvertimeMinutes: 0,
  excludeStatutoryHolidays: false,
  lateNightRatePercent: 25,
  lateNightStartHour: 22,
  lateNightStartMinute: 0,
  lateNightEndHour: 29,
  lateNightEndMinute: 0,
  includeEarlyMorningInLateNight: true,
};

export function toTotalMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

export function fromTotalMinutes(total: number): { hours: number; minutes: number } {
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}
