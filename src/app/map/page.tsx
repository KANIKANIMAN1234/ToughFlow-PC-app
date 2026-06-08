"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { CustomerSiteMapRoot } from "@/components/map/CustomerSiteMap";
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
      <div className="flex h-[calc(100dvh-3.5rem)] flex-col -m-6">
        <CustomerSiteMapRoot enabled={allowed} />
      </div>
    </AppShell>
  );
}
