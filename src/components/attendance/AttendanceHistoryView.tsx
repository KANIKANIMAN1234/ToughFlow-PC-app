"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import {
  PUNCH_LABELS,
  PUNCH_SOURCE_LABELS,
} from "@/lib/attendance/labels";
import type { AttendanceHistoryEntry } from "@/lib/types";
import { daysAgoISO, formatDate, formatDateTime, todayISO } from "@/lib/utils";

type HistoryResponse = {
  punches: AttendanceHistoryEntry[];
  canViewAll: boolean;
  users?: { id: string; name: string }[];
};

type HistoryQuery = {
  fromDate: string;
  toDate: string;
  userId: string;
};

function buildHistoryUrl(query: HistoryQuery) {
  const params = new URLSearchParams({
    fromDate: query.fromDate,
    toDate: query.toDate,
  });
  if (query.userId) params.set("userId", query.userId);
  return `/api/attendance/history?${params.toString()}`;
}

export function AttendanceHistoryView() {
  const [fromDate, setFromDate] = useState(daysAgoISO(30));
  const [toDate, setToDate] = useState(todayISO());
  const [userId, setUserId] = useState("");
  const [appliedQuery, setAppliedQuery] = useState<HistoryQuery>({
    fromDate: daysAgoISO(30),
    toDate: todayISO(),
    userId: "",
  });

  const { data, isLoading } = useApi<HistoryResponse>(
    buildHistoryUrl(appliedQuery)
  );

  const canViewAll = data?.canViewAll ?? false;
  const punches = data?.punches ?? [];
  const users = data?.users ?? [];

  function applyFilters() {
    setAppliedQuery({ fromDate, toDate, userId });
  }

  return (
    <Card title="勤怠打刻履歴">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-caption">
          <span className="text-apple-glyph">開始日</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="block rounded-lg border border-surface-border px-3 py-2 text-body"
          />
        </label>
        <label className="space-y-1 text-caption">
          <span className="text-apple-glyph">終了日</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="block rounded-lg border border-surface-border px-3 py-2 text-body"
          />
        </label>
        {canViewAll && (
          <label className="min-w-[12rem] flex-1 space-y-1 text-caption">
            <span className="text-apple-glyph">担当者</span>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="block w-full rounded-lg border border-surface-border px-3 py-2 text-body"
            >
              <option value="">全員</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          onClick={applyFilters}
          className="rounded-pill bg-brand-600 px-4 py-2 text-body text-white hover:bg-brand-700"
        >
          表示
        </button>
      </div>

      {!canViewAll && !isLoading && (
        <p className="mb-3 text-caption text-apple-glyph">
          自分の打刻履歴のみ表示しています
        </p>
      )}

      {isLoading ? (
        <TableSkeleton rows={8} cols={canViewAll ? 5 : 4} />
      ) : punches.length === 0 ? (
        <p className="text-body text-apple-glyph">該当する打刻履歴がありません</p>
      ) : (
        <DataTable
          columns={[
            { key: "workDate", label: "勤務日" },
            ...(canViewAll ? [{ key: "user", label: "氏名" }] : []),
            { key: "punchType", label: "打刻種別" },
            { key: "punchedAt", label: "打刻日時" },
            { key: "source", label: "端末" },
          ]}
          rows={punches.map((p) => ({
            workDate: formatDate(p.workDate),
            user: p.userName,
            punchType: (
              <Badge tone="info">{PUNCH_LABELS[p.punchType]}</Badge>
            ),
            punchedAt: formatDateTime(p.punchedAt),
            source: PUNCH_SOURCE_LABELS[p.source],
          }))}
        />
      )}
    </Card>
  );
}
