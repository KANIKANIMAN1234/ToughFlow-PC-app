"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AttendanceHistoryView } from "@/components/attendance/AttendanceHistoryView";
import { AppShell } from "@/components/layout/AppShell";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { usePermissions } from "@/hooks/usePermissions";

export default function AttendanceHistoryPage() {
  const { user, authLoading } = useAuthGuard();
  const { canAccess, loading: permLoading } = usePermissions();
  const router = useRouter();

  const allowed =
    canAccess("attendance_register") || canAccess("attendance_view_all");

  useEffect(() => {
    if (authLoading || permLoading) return;
    if (user && !allowed) router.replace("/home");
  }, [user, authLoading, permLoading, allowed, router]);

  if (authLoading || permLoading || !user) {
    return (
      <AppShell
        title="勤怠履歴"
        breadcrumbs={["ToughFlow", "事務処理", "勤怠履歴"]}
      >
        <TableSkeleton rows={8} cols={5} />
      </AppShell>
    );
  }

  if (!allowed) {
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
      <AttendanceHistoryView />
    </AppShell>
  );
}
