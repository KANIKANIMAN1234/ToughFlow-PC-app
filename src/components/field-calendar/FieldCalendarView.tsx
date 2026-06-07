"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import {
  eventShortLabel,
  formatEventTime,
  groupEventsByDate,
  groupEventsByPerson,
  groupEventsBySite,
} from "@/lib/field-calendar/google-events";
import {
  buildMonthGrid,
  formatMonthTitle,
  getMonthRange,
  getTodayKey,
  WEEKDAY_LABELS,
  type CalendarViewMode,
} from "@/lib/field-calendar/grid";
import type { GoogleCalendarEvent } from "@/lib/google/calendar";
import { cn, formatDate } from "@/lib/utils";

const VIEW_TABS: { id: CalendarViewMode; label: string }[] = [
  { id: "calendar", label: "カレンダー" },
  { id: "person", label: "人軸" },
  { id: "site", label: "現場軸" },
];

const MAX_EVENTS_PER_CELL = 3;

function EventDetailRow({ event }: { event: GoogleCalendarEvent }) {
  return (
    <div className="rounded-xl border border-surface-border bg-white px-3 py-2.5">
      <p className="text-caption font-normal text-apple-text">{event.title}</p>
      <p className="text-nav-link text-apple-glyph">
        {formatEventTime(event)}
        {event.location ? ` · ${event.location}` : ""}
      </p>
      {event.assignees.length > 0 && (
        <p className="text-nav-link text-apple-glyph">
          参加者: {event.assignees.join("、")}
        </p>
      )}
      {event.description && (
        <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-nav-link text-apple-glyph">
          {event.description}
        </p>
      )}
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
  const { data, isLoading, error } = useApi<{
    events: GoogleCalendarEvent[];
    error?: string;
  }>(enabled ? `/api/calendar/events?from=${range.from}&to=${range.to}` : null);

  const events = useMemo(() => data?.events ?? [], [data?.events]);
  const byDate = useMemo(() => groupEventsByDate(events), [events]);
  const byPerson = useMemo(() => groupEventsByPerson(events), [events]);
  const bySite = useMemo(() => groupEventsBySite(events), [events]);
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

      {error ? (
        <Card title="Googleカレンダー">
          <p className="text-caption text-red-600">
            Googleカレンダーの取得に失敗しました。環境変数（GOOGLE_CALENDAR_ID、
            GOOGLE_SERVICE_ACCOUNT_JSON）とカレンダー共有設定を確認してください。
          </p>
        </Card>
      ) : isLoading && !data ? (
        <TableSkeleton rows={8} cols={7} />
      ) : viewMode === "calendar" ? (
        <>
          <Card title={`Googleカレンダー予定（${events.length}件）`}>
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
                  const dayEvents = byDate.get(cell.dateKey) ?? [];
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
                        {dayEvents.slice(0, MAX_EVENTS_PER_CELL).map((ev) => (
                          <div
                            key={ev.id}
                            className="truncate rounded bg-sky-50 px-1 py-0.5 text-[10px] leading-tight text-sky-900"
                            title={ev.title}
                          >
                            {eventShortLabel(ev)}
                          </div>
                        ))}
                        {dayEvents.length > MAX_EVENTS_PER_CELL && (
                          <p className="text-[10px] text-apple-glyph">
                            +{dayEvents.length - MAX_EVENTS_PER_CELL}件
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
              <p className="text-caption text-apple-glyph">この日の予定はありません。</p>
            ) : (
              <div className="space-y-2">
                {selectedRows.map((row) => (
                  <EventDetailRow key={row.id} event={row} />
                ))}
              </div>
            )}
          </Card>
        </>
      ) : viewMode === "person" ? (
        <Card title={`人軸表示（${byPerson.length}名）`}>
          {byPerson.length === 0 ? (
            <p className="text-caption text-apple-glyph">この月の予定はありません。</p>
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
                      { key: "title", label: "予定" },
                      { key: "time", label: "時間" },
                      { key: "location", label: "場所" },
                    ]}
                    rows={group.rows.map((r) => ({
                      date: formatDate(r.dateKey),
                      title: r.title,
                      time: formatEventTime(r),
                      location: r.location || "—",
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
            <p className="text-caption text-apple-glyph">この月の予定はありません。</p>
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
                      { key: "title", label: "予定" },
                      { key: "time", label: "時間" },
                      { key: "assignees", label: "参加者" },
                    ]}
                    rows={group.rows.map((r) => ({
                      date: formatDate(r.dateKey),
                      title: r.title,
                      time: formatEventTime(r),
                      assignees:
                        r.assignees.length > 0 ? r.assignees.join("、") : "—",
                    }))}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <p className="text-nav-link text-apple-glyph">
        Googleカレンダーに登録された作業予定を表示しています。配車情報は「配車」メニューからご確認ください。
      </p>
    </div>
  );
}
