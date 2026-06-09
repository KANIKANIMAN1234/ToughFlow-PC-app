"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import type { AttendanceDayRow } from "@/lib/attendance/history";

type HistoryResponse = {
  rows: AttendanceDayRow[];
  staff: { id: string; name: string; staffCode?: string }[];
  canViewAll: boolean;
};

type Props = {
  enabled: boolean;
};

function monthRange(year: number, month: number) {
  const fromDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const toDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { fromDate, toDate };
}

export function AttendanceMonthlySummaryTab({ enabled }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [applied, setApplied] = useState<{ year: number; month: number } | null>(null);

  const apiPath = useMemo(() => {
    if (!enabled || !applied) return null;
    const { fromDate, toDate } = monthRange(applied.year, applied.month);
    return `/api/attendance/history?fromDate=${fromDate}&toDate=${toDate}`;
  }, [enabled, applied]);

  const { data, isLoading } = useApi<HistoryResponse>(apiPath);

  const summaryRows = useMemo(() => {
    if (!data?.rows.length) return [];

    const byUser = new Map<
      string,
      { userName: string; dayCount: number; hasBreak: boolean }
    >();

    for (const row of data.rows) {
      const existing = byUser.get(row.userId) ?? {
        userName: row.userName,
        dayCount: 0,
        hasBreak: false,
      };
      existing.dayCount += 1;
      if (row.breaks !== "—") existing.hasBreak = true;
      byUser.set(row.userId, existing);
    }

    return [...byUser.values()].map((item) => ({
      userName: item.userName,
      group: "未所属",
      workTime: "—",
      breakTime: item.hasBreak ? "—" : "—",
      estimatedPay: "—",
      dayCount: item.dayCount,
    }));
  }, [data?.rows]);

  const title = applied
    ? `${applied.year}年${applied.month}月の勤務状況`
    : "勤務集計（月別）";

  return (
    <Card title={title}>
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <Input
          label="年"
          type="number"
          min={2020}
          max={2100}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-28"
        />
        <label className="block space-y-1.5">
          <span className="text-caption font-medium text-apple-text">月</span>
          <select
            className="w-28 rounded-xl border border-surface-border bg-white px-3 py-2.5 text-body text-apple-text focus-apple"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}月
              </option>
            ))}
          </select>
        </label>
        <Button type="button" onClick={() => setApplied({ year, month })}>
          表示
        </Button>
      </div>

      {!applied ? (
        <p className="text-caption text-apple-glyph">
          年月を指定して「表示」を押してください。
        </p>
      ) : isLoading && !data ? (
        <TableSkeleton rows={6} cols={6} />
      ) : (
        <>
          <p className="mb-4 text-caption text-apple-glyph">
            労働時間・休憩時間・概算給与は就業設定連携後に算出されます。
          </p>
          <DataTable
            columns={[
              { key: "userName", label: "スタッフ" },
              { key: "link", label: "リンク" },
              { key: "group", label: "所属グループ" },
              { key: "workTime", label: "労働時間" },
              { key: "breakTime", label: "休憩時間" },
              { key: "estimatedPay", label: "概算給与" },
            ]}
            rows={summaryRows.map((row) => ({
              userName: row.userName,
              link: "—",
              group: row.group,
              workTime: row.workTime,
              breakTime: row.breakTime,
              estimatedPay: row.estimatedPay,
            }))}
          />
        </>
      )}
    </Card>
  );
}
