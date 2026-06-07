"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import {
  buildMonthGrid,
  formatMonthTitle,
  getMonthRange,
  getTodayKey,
  groupDispatchesByDate,
  groupDispatchesByPerson,
  groupDispatchesBySite,
  siteShortLabel,
  WEEKDAY_LABELS,
  type CalendarViewMode,
} from "@/lib/dispatch/calendar";
import { cn, formatDate } from "@/lib/utils";
import type { DispatchRow } from "@/lib/types";

const VIEW_TABS: { id: CalendarViewMode; label: string }[] = [
  { id: "calendar", label: "カレンダー" },
  { id: "person", label: "人軸" },
  { id: "site", label: "現場軸" },
];

const MAX_EVENTS_PER_CELL = 3;

function DispatchStatusBadge({ status }: { status: DispatchRow["status"] }) {
  return (
    <Badge tone={status === "confirmed" ? "success" : "warning"}>
      {status === "confirmed" ? "確定" : "下書き"}
    </Badge>
  );
}

function DispatchDetailRow({ row }: { row: DispatchRow }) {
  const site =
    row.customerName && row.siteName
      ? `${row.customerName} / ${row.siteName}`
      : row.siteName || row.customerName || "—";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-surface-border bg-white px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-caption font-normal text-apple-text">{site}</p>
        <p className="text-nav-link text-apple-glyph">
          {row.assignee || "担当未設定"} · {row.vehicles || "車両未設定"} ·{" "}
          {row.workers}名
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <DispatchStatusBadge status={row.status} />
        <Link
          href={`/dispatch/${row.id}`}
          className="text-caption text-apple-link hover:underline focus-apple"
        >
          詳細
        </Link>
      </div>
    </div>
  );
}

type Props = {
  enabled: boolean;
};

export function FieldCalendarView({ enabled }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("calendar");
  const [selectedDate, setSelectedDate] = useState(getTodayKey());

  const range = useMemo(() => getMonthRange(year, month), [year, month]);
  const { data, isLoading } = useApi<{ dispatches: DispatchRow[] }>(
    enabled ? `/api/dispatches?from=${range.from}&to=${range.to}` : null
  );

  const dispatches = useMemo(() => data?.dispatches ?? [], [data?.dispatches]);
  const byDate = useMemo(() => groupDispatchesByDate(dispatches), [dispatches]);
  const byPerson = useMemo(
    () => groupDispatchesByPerson(dispatches),
    [dispatches]
  );
  const bySite = useMemo(() => groupDispatchesBySite(dispatches), [dispatches]);
  const monthGrid = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const selectedRows = byDate.get(selectedDate) ?? [];

  function shiftMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }

  function goToday() {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    setSelectedDate(getTodayKey());
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-lg p-2 text-apple-glyph ring-1 ring-surface-border hover:bg-apple-section focus-apple"
            aria-label="前月"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="apple-heading min-w-[8rem] text-center text-body">
            {formatMonthTitle(year, month)}
          </h2>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-lg p-2 text-apple-glyph ring-1 ring-surface-border hover:bg-apple-section focus-apple"
            aria-label="翌月"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="rounded-pill px-3 py-1.5 text-caption text-apple-glyph ring-1 ring-surface-border hover:bg-apple-section focus-apple"
          >
            今月
          </button>
        </div>

        <div className="flex gap-2">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setViewMode(tab.id)}
              className={cn(
                "rounded-pill px-4 py-2 text-caption font-normal focus-apple",
                viewMode === tab.id
                  ? "bg-brand-600 text-white"
                  : "bg-white text-apple-glyph ring-1 ring-surface-border"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && !data ? (
        <TableSkeleton rows={8} cols={7} />
      ) : viewMode === "calendar" ? (
        <>
          <Card title={`配車予定（${dispatches.length}件）`}>
            <div className="overflow-x-auto">
              <div className="grid min-w-[640px] grid-cols-7 border-b border-surface-border">
                {WEEKDAY_LABELS.map((label, i) => (
                  <div
                    key={label}
                    className={cn(
                      "py-2 text-center text-caption font-normal",
                      i === 0 ? "text-red-500" : i === 6 ? "text-blue-600" : "text-apple-glyph"
                    )}
                  >
                    {label}
                  </div>
                ))}
              </div>
              <div className="grid min-w-[640px] grid-cols-7">
                {monthGrid.map((cell) => {
                  const events = byDate.get(cell.dateKey) ?? [];
                  const isSelected = selectedDate === cell.dateKey;
                  return (
                    <button
                      key={cell.dateKey}
                      type="button"
                      onClick={() => setSelectedDate(cell.dateKey)}
                      className={cn(
                        "min-h-[6.5rem] border-b border-r border-surface-border p-1.5 text-left transition-colors focus-apple",
                        !cell.inMonth && "bg-apple-section/40",
                        isSelected && "bg-brand-50 ring-2 ring-inset ring-brand-400",
                        cell.isToday && !isSelected && "bg-amber-50/60"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-full text-caption",
                          cell.isToday && "bg-brand-600 font-normal text-white",
                          !cell.inMonth && "text-apple-glyph/60",
                          cell.inMonth && !cell.isToday && "text-apple-text"
                        )}
                      >
                        {cell.day}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {events.slice(0, MAX_EVENTS_PER_CELL).map((ev) => (
                          <div
                            key={ev.id}
                            className={cn(
                              "truncate rounded px-1 py-0.5 text-[10px] leading-tight",
                              ev.status === "confirmed"
                                ? "bg-emerald-50 text-emerald-900"
                                : "bg-amber-50 text-amber-900"
                            )}
                            title={`${siteShortLabel(ev)} / ${ev.assignee}`}
                          >
                            {siteShortLabel(ev)}
                          </div>
                        ))}
                        {events.length > MAX_EVENTS_PER_CELL && (
                          <p className="text-[10px] text-apple-glyph">
                            +{events.length - MAX_EVENTS_PER_CELL}件
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          <Card title={`${formatDate(selectedDate)} の予定（${selectedRows.length}件）`}>
            {selectedRows.length === 0 ? (
              <p className="text-caption text-apple-glyph">この日の配車予定はありません。</p>
            ) : (
              <div className="space-y-2">
                {selectedRows.map((row) => (
                  <DispatchDetailRow key={row.id} row={row} />
                ))}
              </div>
            )}
          </Card>
        </>
      ) : viewMode === "person" ? (
        <Card title={`人軸表示（${byPerson.length}名）`}>
          {byPerson.length === 0 ? (
            <p className="text-caption text-apple-glyph">この月の配車予定はありません。</p>
          ) : (
            <div className="space-y-6">
              {byPerson.map((group) => (
                <div key={group.assignee}>
                  <h3 className="mb-2 text-caption font-normal text-apple-text">
                    {group.assignee}
                    <span className="ml-2 text-apple-glyph">（{group.rows.length}件）</span>
                  </h3>
                  <DataTable
                    columns={[
                      { key: "date", label: "日付" },
                      { key: "site", label: "現場" },
                      { key: "vehicles", label: "車両" },
                      { key: "workers", label: "人数" },
                      { key: "status", label: "状態" },
                      { key: "link", label: "" },
                    ]}
                    rows={group.rows.map((r) => ({
                      date: formatDate(r.dispatchDate),
                      site:
                        r.customerName && r.siteName
                          ? `${r.customerName} / ${r.siteName}`
                          : r.siteName || r.customerName || "—",
                      vehicles: r.vehicles || "—",
                      workers: `${r.workers}名`,
                      status: <DispatchStatusBadge status={r.status} />,
                      link: (
                        <Link
                          href={`/dispatch/${r.id}`}
                          className="text-brand-600 hover:underline"
                        >
                          詳細
                        </Link>
                      ),
                    }))}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <Card title={`現場軸表示（${bySite.length}現場）`}>
          {bySite.length === 0 ? (
            <p className="text-caption text-apple-glyph">この月の配車予定はありません。</p>
          ) : (
            <div className="space-y-6">
              {bySite.map((group) => (
                <div key={group.siteLabel}>
                  <h3 className="mb-2 text-caption font-normal text-apple-text">
                    {group.siteLabel}
                    <span className="ml-2 text-apple-glyph">（{group.rows.length}件）</span>
                  </h3>
                  <DataTable
                    columns={[
                      { key: "date", label: "日付" },
                      { key: "assignee", label: "担当" },
                      { key: "vehicles", label: "車両" },
                      { key: "workers", label: "人数" },
                      { key: "status", label: "状態" },
                      { key: "link", label: "" },
                    ]}
                    rows={group.rows.map((r) => ({
                      date: formatDate(r.dispatchDate),
                      assignee: r.assignee || "—",
                      vehicles: r.vehicles || "—",
                      workers: `${r.workers}名`,
                      status: <DispatchStatusBadge status={r.status} />,
                      link: (
                        <Link
                          href={`/dispatch/${r.id}`}
                          className="text-brand-600 hover:underline"
                        >
                          詳細
                        </Link>
                      ),
                    }))}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <p className="text-nav-link text-apple-glyph">
        配車データ（t_dispatch）と連動しています。Google Calendar 連携は今後追加予定です。
      </p>
    </div>
  );
}
