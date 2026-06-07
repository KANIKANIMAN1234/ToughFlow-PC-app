"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { FieldCalendarView } from "@/components/field-calendar/FieldCalendarView";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { usePermissions } from "@/hooks/usePermissions";

export default function FieldCalendarPage() {
  const { user, authLoading } = useAuthGuard();
  const { canAccess, loading: permLoading } = usePermissions();
  const router = useRouter();

  const allowed =
    canAccess("dispatch_list_view") || canAccess("dispatch_view");

  useEffect(() => {
    if (authLoading || permLoading) return;
    if (user && !allowed) router.replace("/home");
  }, [user, authLoading, permLoading, allowed, router]);

  if (authLoading || permLoading || !user) {
    return (
      <AppShell title="現場カレンダー" breadcrumbs={["ToughFlow", "現場カレンダー"]}>
        <CardGridSkeleton />
      </AppShell>
    );
  }

  if (!allowed) {
    return (
      <AppShell title="現場カレンダー" breadcrumbs={["ToughFlow", "現場カレンダー"]}>
        <CardGridSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell title="現場カレンダー" breadcrumbs={["ToughFlow", "現場カレンダー"]}>
      <FieldCalendarView enabled={allowed} />
    </AppShell>
  );
}
