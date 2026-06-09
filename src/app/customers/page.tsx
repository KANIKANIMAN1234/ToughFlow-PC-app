"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import type { Customer } from "@/lib/types";

export default function CustomersPage() {
  const { user, authLoading } = useAuthGuard();
  const [query, setQuery] = useState("");
  const { data, isLoading } = useApi<{ customers: Customer[] }>(
    user ? "/api/customers" : null
  );

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

  if (authLoading || !user) {
    return (
      <AppShell title="顧客リスト" breadcrumbs={["ToughFlow", "顧客リスト"]}>
        <TableSkeleton rows={6} cols={4} />
      </AppShell>
    );
  }

  return (
    <AppShell title="顧客リスト" breadcrumbs={["ToughFlow", "顧客リスト"]}>
      <Card title="顧客リスト">
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
