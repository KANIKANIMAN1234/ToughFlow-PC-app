/** 残業計算区分マスタの初期データ（テナント初回参照時に投入） */
export const EMPLOYMENT_OVERTIME_CALC_SEED: { code: string; name: string }[] = [
  { code: "daily", name: "日計算" },
  { code: "daily_by_weekday", name: "日計算（曜日毎）" },
  { code: "greater_of_day_or_week", name: "日または週(多い方)" },
  { code: "greater_of_day_week_month", name: "日または週または月(多い方)" },
  { code: "time_specified", name: "時刻指定" },
  { code: "weekly", name: "週計算" },
  { code: "monthly", name: "月計算" },
  { code: "monthly_flex", name: "月計算(フレックス)" },
  { code: "yearly", name: "年計算" },
  { code: "yearly_flex", name: "年計算(フレックス)" },
  { code: "application", name: "申請" },
  { code: "outside_shift", name: "シフト外労働時間" },
];

export const DEFAULT_OVERTIME_CALC_TYPE_CODE = "greater_of_day_or_week";
