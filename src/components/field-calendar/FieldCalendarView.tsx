"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import {
  formatEventTime,
  groupEventsByPerson,
  groupEventsBySite,
} from "@/lib/field-calendar/google-events";
import {
  formatMonthTitle,
  getMonthRange,
  type CalendarViewMode,
} from "@/lib/field-calendar/grid";
import type { GoogleCalendarEvent } from "@/lib/google/calendar";
import { cn, formatDate } from "@/lib/utils";

const VIEW_TABS: { id: CalendarViewMode; label: string }[] = [
  { id: "calendar", label: "カレンダー" },
  { id: "person", label: "人軸" },
  { id: "site", label: "現場軸" },
];

const GOOGLE_CALENDAR_EMBED_URL =
  "https://calendar.google.com/calendar/embed?src=kanikaniman1234%40gmail.com&ctz=Asia%2FTokyo";

type Props = {
  enabled: boolean;
};

export function FieldCalendarView({ enabled }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("calendar");

  const range = useMemo(() => getMonthRange(year, month), [year, month]);
  const { data, isLoading, error } = useApi<{
    events: GoogleCalendarEvent[];
    error?: string;
  }>(enabled ? `/api/calendar/events?from=${range.from}&to=${range.to}` : null);

  const events = useMemo(() => data?.events ?? [], [data?.events]);
  const byPerson = useMemo(() => groupEventsByPerson(events), [events]);
  const bySite = useMemo(() => groupEventsBySite(events), [events]);

  function shiftMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }

  function goToday() {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
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

      {viewMode === "calendar" ? (
        <div className="overflow-hidden rounded-card border border-surface-border bg-white">
          <iframe
            src={GOOGLE_CALENDAR_EMBED_URL}
            title="Googleカレンダー"
            className="w-full border-0"
            style={{ height: 600 }}
          />
        </div>
      ) : error ? (
        <Card title="Googleカレンダー">
          <p className="text-caption text-red-600">
            Googleカレンダーの取得に失敗しました。
            {error instanceof Error && error.message
              ? `（${error.message}）`
              : " 環境変数（GOOGLE_CALENDAR_ID、GOOGLE_SERVICE_ACCOUNT_JSON）とカレンダー共有設定を確認してください。"}
          </p>
        </Card>
      ) : isLoading && !data ? (
        <TableSkeleton rows={8} cols={7} />
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
