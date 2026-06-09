import type {
  Agreement36FiscalInput,
  Agreement36GlobalInput,
} from "@/lib/types";

export const AGREEMENT_36_GLOBAL_FISCAL_YEAR = 0;

export const DEFAULT_AGREEMENT_36_GLOBAL: Agreement36GlobalInput = {
  isEnabled: false,
  startMonth: 4,
  startDay: 1,
  agreementVersion: "new",
};

export const DEFAULT_AGREEMENT_36_FISCAL: Agreement36FiscalInput = {
  fiscalYear: new Date().getFullYear(),
  specialDailyHours: 4,
  specialMonthlyHours: 100,
  specialExceedCount: 6,
  specialYearlyHours: 720,
  alertDailyEnabled: true,
  alertDailyHours: 4,
  alertWeeklyEnabled: true,
  alertWeeklyHours: 20,
  alertMonthlyEnabled: true,
  alertMonthlyHours: 80,
  alertAvg26Enabled: true,
  alertAvg26Hours: 60,
  alertYearlyEnabled: true,
  alertYearlyHours: 600,
  alertExceedCountEnabled: true,
  alertExceedCount: 6,
  notifyEmployee: false,
  notifyAdmin: false,
  notifyCustom: false,
  notifyCustomUserId: null,
  notifyCustomEmail: "",
};

export function currentFiscalYear(startMonth = 4): number {
  const now = new Date();
  const month = now.getMonth() + 1;
  return month >= startMonth ? now.getFullYear() : now.getFullYear() - 1;
}

export function fiscalYearOptions(center = currentFiscalYear()): number[] {
  return [center + 1, center, center - 1, center - 2];
}
