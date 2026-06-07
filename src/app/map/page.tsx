"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { CustomerSiteMapRoot } from "@/components/map/CustomerSiteMap";
import { Card } from "@/components/ui/Card";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { usePermissions } from "@/hooks/usePermissions";

export default function MapPage() {
  const { user, authLoading } = useAuthGuard();
  const { canAccess, loading: permLoading } = usePermissions();
  const router = useRouter();

  const allowed = canAccess("project_list_other");

  useEffect(() => {
    if (authLoading || permLoading) return;
    if (user && !allowed) router.replace("/home");
  }, [user, authLoading, permLoading, allowed, router]);

  if (authLoading || permLoading || !user) {
    return (
      <AppShell title="地図" breadcrumbs={["ToughFlow", "地図"]}>
        <CardGridSkeleton />
      </AppShell>
    );
  }

  if (!allowed) {
    return (
      <AppShell title="地図" breadcrumbs={["ToughFlow", "地図"]}>
        <CardGridSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell title="地図" breadcrumbs={["ToughFlow", "地図"]}>
      <Card title="顧客・案件の現場位置">
        <CustomerSiteMapRoot enabled={allowed} />
      </Card>
    </AppShell>
  );
}
