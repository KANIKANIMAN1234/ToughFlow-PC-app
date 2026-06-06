"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { formatYen } from "@/lib/utils";
import type { Project } from "@/lib/types";

export default function ProjectsPage() {
  const { user, authLoading } = useAuthGuard();
  const { data, isLoading } = useApi<{ projects: Project[] }>(
    user ? "/api/projects" : null
  );

  const projects = data?.projects ?? [];

  if (authLoading || !user) {
    return (
      <AppShell title="案件一覧" breadcrumbs={["ToughFlow", "案件"]}>
        <TableSkeleton rows={6} cols={5} />
      </AppShell>
    );
  }

  return (
    <AppShell title="案件一覧" breadcrumbs={["ToughFlow", "案件"]}>
      <Card title="SC-050 案件一覧">
        {isLoading && !data ? (
          <TableSkeleton rows={6} cols={5} />
        ) : (
          <DataTable
            columns={[
              { key: "name", label: "案件名" },
              { key: "customer", label: "顧客" },
              { key: "address", label: "現場住所" },
              { key: "sales", label: "受注金額" },
              { key: "status", label: "状態" },
            ]}
            rows={projects.map((p) => ({
              name: p.name,
              customer: p.customerName,
              address: p.siteAddress,
              sales: p.salesAmount ? formatYen(p.salesAmount) : "—",
              status: (
                <Badge tone={p.status === "active" ? "success" : "default"}>
                  {p.status}
                </Badge>
              ),
            }))}
          />
        )}
      </Card>
    </AppShell>
  );
}
