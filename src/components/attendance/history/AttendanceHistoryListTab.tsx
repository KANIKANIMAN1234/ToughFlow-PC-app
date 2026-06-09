"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import type { AttendanceDayRow, AttendanceStaffOption } from "@/lib/attendance/history";
import { daysAgoISO, formatDate, todayISO } from "@/lib/utils";

type HistoryResponse = {
  rows: AttendanceDayRow[];
};

type StaffResponse = {
  staff: AttendanceStaffOption[];
  canViewAll: boolean;
};

type Props = {
  enabled: boolean;
};

export function AttendanceHistoryListTab({ enabled }: Props) {
  const [fromDate, setFromDate] = useState(daysAgoISO(30));
  const [toDate, setToDate] = useState(todayISO());
  const [userId, setUserId] = useState("");
  const [query, setQuery] = useState<{ fromDate: string; toDate: string; userId: string } | null>(
    null
  );

  const apiPath = useMemo(() => {
    if (!enabled || !query) return null;
    const params = new URLSearchParams({
      fromDate: query.fromDate,
      toDate: query.toDate,
    });
    if (query.userId) params.set("userId", query.userId);
    return `/api/attendance/history?${params.toString()}`;
  }, [enabled, query]);

  const { data: staffData } = useApi<StaffResponse>(
    enabled ? "/api/attendance/staff" : null
  );
  const { data, isLoading } = useApi<HistoryResponse>(apiPath);

  function handleSearch() {
    setQuery({ fromDate, toDate, userId });
  }

  return (
    <Card title="勤怠打刻履歴">
      <div className="mb-6 grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
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
        {staffData?.canViewAll && (
          <label className="block space-y-1.5">
            <span className="text-caption font-medium text-apple-text">担当者</span>
            <select
              className="w-full rounded-xl border border-surface-border bg-white px-3 py-2.5 text-body text-apple-text focus-apple"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">全員</option>
              {(staffData?.staff ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <Button type="button" onClick={handleSearch}>
          表示
        </Button>
      </div>

      {!query ? (
        <p className="text-caption text-apple-glyph">
          期間を指定して「表示」を押してください。
        </p>
      ) : isLoading && !data ? (
        <TableSkeleton rows={8} cols={5} />
      ) : (
        <DataTable
          columns={[
            { key: "workDate", label: "勤務日" },
            { key: "userName", label: "氏名" },
            { key: "clockIn", label: "出勤" },
            { key: "clockOut", label: "退勤" },
            { key: "breaks", label: "中抜け" },
          ]}
          rows={(data?.rows ?? []).map((row) => ({
            workDate: formatDate(row.workDate),
            userName: row.userName,
            clockIn: row.clockIn ?? "—",
            clockOut: row.clockOut ?? "—",
            breaks: row.breaks,
          }))}
        />
      )}
    </Card>
  );
}
