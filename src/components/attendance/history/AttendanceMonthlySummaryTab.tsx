"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import type { MonthlyWorkSummary } from "@/lib/attendance/summary";

type SummaryResponse = {
  summaries: MonthlyWorkSummary[];
  canViewAll: boolean;
  year: number;
  month: number;
};

type Props = {
  enabled: boolean;
};

export function AttendanceMonthlySummaryTab({ enabled }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [applied, setApplied] = useState<{ year: number; month: number } | null>(
    null
  );

  const apiPath = useMemo(() => {
    if (!enabled || !applied) return null;
    return `/api/attendance/monthly-summary?year=${applied.year}&month=${applied.month}`;
  }, [enabled, applied]);

  const { data, isLoading } = useApi<SummaryResponse>(apiPath);

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
        <TableSkeleton rows={6} cols={8} />
      ) : (
        <DataTable
          columns={[
            { key: "userName", label: "スタッフ" },
            { key: "link", label: "リンク" },
            { key: "group", label: "所属グループ" },
            { key: "workTime", label: "労働時間" },
            { key: "overtimeTime", label: "残業時間" },
            { key: "lateNightTime", label: "深夜残業時間" },
            { key: "breakTime", label: "休憩時間" },
            { key: "estimatedPayDisplay", label: "概算給与" },
          ]}
          rows={(data?.summaries ?? []).map((row) => ({
            userName: row.userName,
            link: "—",
            group: row.group,
            workTime: row.workTime,
            overtimeTime: row.overtimeTime,
            lateNightTime: row.lateNightTime,
            breakTime: row.breakTime,
            estimatedPayDisplay: row.estimatedPayDisplay,
          }))}
        />
      )}
    </Card>
  );
}
