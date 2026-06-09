"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { usePermissions } from "@/hooks/usePermissions";
import type { Customer } from "@/lib/types";

export default function CustomersPage() {
  const { user, authLoading } = useAuthGuard();
  const { canAccess, loading: permLoading } = usePermissions();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const allowed = canAccess("project_list_other");
  const { data, isLoading, error } = useApi<{ customers: Customer[] }>(
    user && allowed ? "/api/customers" : null
  );

  useEffect(() => {
    if (authLoading || permLoading) return;
    if (user && !allowed) router.replace("/home");
  }, [user, authLoading, permLoading, allowed, router]);

  const filtered = useMemo(() => {
    const customers = data?.customers ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)
    );
  }, [data?.customers, query]);

  if (authLoading || permLoading || !user) {
    return (
      <AppShell title="顧客リスト" breadcrumbs={["ToughFlow", "顧客リスト"]}>
        <TableSkeleton rows={6} cols={4} />
      </AppShell>
    );
  }

  if (!allowed) {
    return (
      <AppShell title="顧客リスト" breadcrumbs={["ToughFlow", "顧客リスト"]}>
        <TableSkeleton rows={6} cols={4} />
      </AppShell>
    );
  }

  return (
    <AppShell title="顧客リスト" breadcrumbs={["ToughFlow", "顧客リスト"]}>
      <Card title="顧客リスト">
        {error && (
          <p className="mb-4 text-caption text-red-600" role="alert">
            顧客データの取得に失敗しました: {error.message}
          </p>
        )}
        <div className="mb-4 max-w-md">
          <Input
            type="search"
            placeholder="顧客名・住所で検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="顧客検索"
          />
        </div>

        {isLoading && !data ? (
          <TableSkeleton rows={6} cols={4} />
        ) : (
          <DataTable
            columns={[
              { key: "name", label: "顧客名" },
              { key: "address", label: "住所" },
              { key: "projects", label: "案件数" },
              { key: "map", label: "地図" },
            ]}
            rows={filtered.map((c) => ({
              name: c.name,
              address: c.address || "—",
              projects: `${c.projectCount}件`,
              map: (
                <Badge tone={c.hasMapPin ? "success" : "default"}>
                  {c.hasMapPin ? "座標登録済" : "未登録"}
                </Badge>
              ),
            }))}
          />
        )}
      </Card>
    </AppShell>
  );
}
