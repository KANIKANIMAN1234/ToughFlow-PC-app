"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import type { AttendanceStaffOption } from "@/lib/attendance/history";
import { STAFF_TYPE_OPTIONS } from "@/lib/staff/constants";
import type { StaffType } from "@/lib/types";
import { cn } from "@/lib/utils";

type StaffResponse = {
  staff: AttendanceStaffOption[];
  canViewAll: boolean;
};

type Props = {
  enabled: boolean;
};

const PERIOD_COLUMNS = [
  { key: "thisWeek", label: "今週" },
  { key: "monthly", label: "月間" },
  { key: "twoMonths", label: "2か月" },
  { key: "threeMonths", label: "3か月" },
  { key: "fourMonths", label: "4か月" },
  { key: "fiveMonths", label: "5か月" },
  { key: "sixMonths", label: "6か月" },
  { key: "annual", label: "年間" },
] as const;

type PeriodKey = (typeof PERIOD_COLUMNS)[number]["key"];

type OvertimeRow = {
  staffCode: string;
  userName: string;
  mainGroup: string;
  staffType: string;
  specialMonths: string;
} & Record<PeriodKey, string>;

function staffTypeLabel(type?: StaffType): string {
  if (!type) return "未分類";
  return STAFF_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

function fiscalYearOptions(): number[] {
  const current = new Date().getFullYear();
  return [current + 1, current, current - 1, current - 2];
}

function emptyPeriods(): Record<PeriodKey, string> {
  return {
    thisWeek: "0:00",
    monthly: "0:00",
    twoMonths: "0:00",
    threeMonths: "0:00",
    fourMonths: "0:00",
    fiveMonths: "0:00",
    sixMonths: "0:00",
    annual: "0:00",
  };
}

export function AttendanceOvertimeSummaryTab({ enabled }: Props) {
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [appliedYear, setAppliedYear] = useState<number | null>(null);

  const { data, isLoading } = useApi<StaffResponse>(
    enabled && appliedYear !== null ? "/api/attendance/staff" : null
  );

  const rows: OvertimeRow[] = useMemo(() => {
    return (data?.staff ?? []).map((s) => ({
      staffCode: s.staffCode ?? "—",
      userName: s.name,
      mainGroup: "未所属",
      staffType: staffTypeLabel(s.staffType),
      ...emptyPeriods(),
      specialMonths: "0回",
    }));
  }, [data?.staff]);

  return (
    <Card
      title={
        appliedYear !== null
          ? `${appliedYear}年度の法定外労働状況一覧`
          : "法定外労働集計"
      }
      action={
        appliedYear !== null ? (
          <Button type="button" variant="secondary" size="sm" disabled>
            法定外労働状況を更新する
          </Button>
        ) : undefined
      }
    >
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <label className="block space-y-1.5">
          <span className="text-caption font-medium text-apple-text">年度</span>
          <select
            className="w-32 rounded-xl border border-surface-border bg-white px-3 py-2.5 text-body text-apple-text focus-apple"
            value={fiscalYear}
            onChange={(e) => setFiscalYear(Number(e.target.value))}
          >
            {fiscalYearOptions().map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <Button type="button" onClick={() => setAppliedYear(fiscalYear)}>
          表示
        </Button>
      </div>

      {appliedYear === null ? (
        <p className="text-caption text-apple-glyph">
          年度を指定して「表示」を押してください。
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-4 text-nav-link text-apple-glyph">
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-8 rounded bg-amber-100" />
              月45時間または年360時間を超える場合
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-8 rounded bg-yellow-300" />
              設定された36協定アラート通知基準に達した場合
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-8 rounded bg-red-200" />
              設定された36協定基準に達した場合
            </span>
          </div>

          <p className="mb-4 text-caption text-apple-glyph">
            法定外労働時間の集計は就業設定・36協定設定連携後に算出されます。現在はスタッフ一覧の枠組みのみ表示しています。
          </p>

          {isLoading && !data ? (
            <TableSkeleton rows={8} cols={13} />
          ) : (
            <div className="overflow-x-auto rounded-card border border-surface-border">
              <table className="min-w-full divide-y divide-surface-border text-body">
                <thead className="bg-slate-600 text-white">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-caption font-semibold">
                      スタッフコード
                    </th>
                    <th className="px-3 py-2.5 text-left text-caption font-semibold">
                      スタッフ名
                    </th>
                    <th className="px-3 py-2.5 text-left text-caption font-semibold">
                      メイングループ
                    </th>
                    <th className="px-3 py-2.5 text-left text-caption font-semibold">
                      スタッフ種別
                    </th>
                    {PERIOD_COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className="whitespace-nowrap px-3 py-2.5 text-right text-caption font-semibold"
                      >
                        {col.label}
                      </th>
                    ))}
                    <th className="whitespace-nowrap px-3 py-2.5 text-right text-caption font-semibold">
                      特例月
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border bg-white">
                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={13}
                        className="px-4 py-10 text-center text-caption text-apple-glyph"
                      >
                        データがありません
                      </td>
                    </tr>
                  )}
                  {rows.map((row, i) => (
                    <tr
                      key={`${row.staffCode}-${row.userName}`}
                      className={cn(i % 2 === 1 && "bg-apple-section/30")}
                    >
                      <td className="px-3 py-2 text-apple-text">{row.staffCode}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-apple-text">
                        {row.userName}
                      </td>
                      <td className="px-3 py-2 text-apple-text">{row.mainGroup}</td>
                      <td className="px-3 py-2 text-apple-text">{row.staffType}</td>
                      {PERIOD_COLUMNS.map((col) => (
                        <td
                          key={col.key}
                          className="px-3 py-2 text-right tabular-nums text-apple-text"
                        >
                          {row[col.key]}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right text-apple-text">
                        {row.specialMonths}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
