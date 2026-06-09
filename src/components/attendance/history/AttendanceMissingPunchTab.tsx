"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import type { AttendanceDayRow } from "@/lib/attendance/history";
import { daysAgoISO, formatDate, todayISO } from "@/lib/utils";

type HistoryResponse = {
  rows: AttendanceDayRow[];
  staff: { id: string; name: string }[];
  canViewAll: boolean;
};

type Props = {
  enabled: boolean;
};

function detectMissing(row: AttendanceDayRow): string | null {
  if (!row.clockIn) return "出勤打刻なし";
  if (!row.clockOut) return "退勤打刻なし";
  return null;
}

export function AttendanceMissingPunchTab({ enabled }: Props) {
  const [fromDate, setFromDate] = useState(daysAgoISO(30));
  const [toDate, setToDate] = useState(todayISO());
  const [query, setQuery] = useState<{ fromDate: string; toDate: string } | null>(null);

  const apiPath = useMemo(() => {
    if (!enabled || !query) return null;
    return `/api/attendance/history?fromDate=${query.fromDate}&toDate=${query.toDate}`;
  }, [enabled, query]);

  const { data, isLoading } = useApi<HistoryResponse>(apiPath);

  const missingRows = useMemo(() => {
    return (data?.rows ?? [])
      .map((row) => {
        const issue = detectMissing(row);
        if (!issue) return null;
        return {
          workDate: formatDate(row.workDate),
          userName: row.userName,
          clockIn: row.clockIn ?? "—",
          clockOut: row.clockOut ?? "—",
          issue,
        };
      })
      .filter(Boolean) as {
      workDate: string;
      userName: string;
      clockIn: string;
      clockOut: string;
      issue: string;
    }[];
  }, [data?.rows]);

  return (
    <Card title="打刻漏れ">
      <div className="mb-6 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <Input
          label="開始日"
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />
        <Input
          label="終了日"
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />
        <Button type="button" onClick={() => setQuery({ fromDate, toDate })}>
          表示
        </Button>
      </div>

      {!query ? (
        <p className="text-caption text-apple-glyph">
          期間を指定して「表示」を押してください。
        </p>
      ) : isLoading && !data ? (
        <TableSkeleton rows={6} cols={5} />
      ) : (
        <DataTable
          columns={[
            { key: "workDate", label: "勤務日" },
            { key: "userName", label: "氏名" },
            { key: "clockIn", label: "出勤" },
            { key: "clockOut", label: "退勤" },
            { key: "issue", label: "内容" },
          ]}
          rows={missingRows}
        />
      )}
    </Card>
  );
}
