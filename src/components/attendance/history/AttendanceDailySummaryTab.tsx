"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import type { AttendanceDayRow } from "@/lib/attendance/history";
import { formatDate, todayISO } from "@/lib/utils";

type HistoryResponse = {
  rows: AttendanceDayRow[];
  staff: { id: string; name: string }[];
  canViewAll: boolean;
};

type Props = {
  enabled: boolean;
};

export function AttendanceDailySummaryTab({ enabled }: Props) {
  const [workDate, setWorkDate] = useState(todayISO());
  const [appliedDate, setAppliedDate] = useState<string | null>(null);

  const apiPath = useMemo(() => {
    if (!enabled || !appliedDate) return null;
    return `/api/attendance/history?fromDate=${appliedDate}&toDate=${appliedDate}`;
  }, [enabled, appliedDate]);

  const { data, isLoading } = useApi<HistoryResponse>(apiPath);

  const title = appliedDate
    ? `${formatDate(appliedDate)}の勤務状況`
    : "勤務集計（日別）";

  return (
    <Card title={title}>
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <Input
          label="勤務日"
          type="date"
          value={workDate}
          onChange={(e) => setWorkDate(e.target.value)}
        />
        <Button type="button" onClick={() => setAppliedDate(workDate)}>
          表示
        </Button>
      </div>

      {!appliedDate ? (
        <p className="text-caption text-apple-glyph">
          勤務日を指定して「表示」を押してください。
        </p>
      ) : isLoading && !data ? (
        <TableSkeleton rows={6} cols={5} />
      ) : (
        <>
          <p className="mb-4 text-caption text-apple-glyph">
            労働時間の集計は就業設定連携後に算出されます。
          </p>
          <DataTable
            columns={[
              { key: "userName", label: "スタッフ" },
              { key: "clockIn", label: "出勤" },
              { key: "clockOut", label: "退勤" },
              { key: "breaks", label: "休憩" },
              { key: "workTime", label: "労働時間" },
            ]}
            rows={(data?.rows ?? []).map((row) => ({
              userName: row.userName,
              clockIn: row.clockIn ?? "—",
              clockOut: row.clockOut ?? "—",
              breaks: row.breaks,
              workTime: "—",
            }))}
          />
        </>
      )}
    </Card>
  );
}
