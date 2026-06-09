"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { AttendanceAlertTab } from "@/components/attendance/history/AttendanceAlertTab";
import { AttendanceDailySummaryTab } from "@/components/attendance/history/AttendanceDailySummaryTab";
import { AttendanceHistoryListTab } from "@/components/attendance/history/AttendanceHistoryListTab";
import { AttendanceMissingPunchTab } from "@/components/attendance/history/AttendanceMissingPunchTab";
import { AttendanceMonthlySummaryTab } from "@/components/attendance/history/AttendanceMonthlySummaryTab";
import { AttendanceOvertimeSummaryTab } from "@/components/attendance/history/AttendanceOvertimeSummaryTab";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { usePermissions } from "@/hooks/usePermissions";

const TABS = [
  { id: "list", label: "勤務履歴（一覧）" },
  { id: "monthly", label: "勤務集計（月別）" },
  { id: "daily", label: "勤務集計（日別）" },
  { id: "alert", label: "勤務アラート" },
  { id: "missing", label: "打刻漏れ" },
  { id: "overtime", label: "法定外労働集計" },
] as const;

type AttendanceTab = (typeof TABS)[number]["id"];

export default function AttendanceHistoryPage() {
  const router = useRouter();
  const { user, authLoading } = useAuthGuard();
  const { canAccess, loading: permLoading } = usePermissions();
  const [activeTab, setActiveTab] = useState<AttendanceTab>("list");

  const allowed =
    canAccess("attendance_register") || canAccess("attendance_view_all");

  useEffect(() => {
    if (authLoading || permLoading || !user) return;
    if (!allowed) {
      router.replace("/home");
    }
  }, [user, authLoading, permLoading, allowed, router]);

  if (authLoading || permLoading || !user || !allowed) {
    return (
      <AppShell
        title="勤怠履歴"
        breadcrumbs={["ToughFlow", "事務処理", "勤怠履歴"]}
      >
        <TableSkeleton rows={8} cols={5} />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="勤怠履歴"
      breadcrumbs={["ToughFlow", "事務処理", "勤怠履歴"]}
    >
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-surface-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={
              activeTab === tab.id
                ? "shrink-0 border-b-2 border-brand-600 px-4 py-2 text-caption font-medium text-brand-600"
                : "shrink-0 px-4 py-2 text-caption text-apple-glyph hover:text-apple-text"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "list" && <AttendanceHistoryListTab enabled />}
      {activeTab === "monthly" && <AttendanceMonthlySummaryTab enabled />}
      {activeTab === "daily" && <AttendanceDailySummaryTab enabled />}
      {activeTab === "alert" && <AttendanceAlertTab enabled />}
      {activeTab === "missing" && <AttendanceMissingPunchTab enabled />}
      {activeTab === "overtime" && <AttendanceOvertimeSummaryTab enabled />}
    </AppShell>
  );
}
