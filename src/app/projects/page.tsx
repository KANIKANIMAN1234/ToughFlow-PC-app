"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { usePermissions } from "@/hooks/usePermissions";
import { formatYen } from "@/lib/utils";
import type { Project } from "@/lib/types";

export default function ProjectsPage() {
  const { user, authLoading } = useAuthGuard();
  const { canAccess } = usePermissions();
  const { data, isLoading } = useApi<{ projects: Project[] }>(
    user ? "/api/projects" : null
  );

  const projects = data?.projects ?? [];
  const canRegister = canAccess("project_register");

  if (authLoading || !user) {
    return (
      <AppShell title="案件一覧" breadcrumbs={["ToughFlow", "案件"]}>
        <TableSkeleton rows={6} cols={7} />
      </AppShell>
    );
  }

  return (
    <AppShell title="案件一覧" breadcrumbs={["ToughFlow", "案件"]}>
      <Card
        title="SC-050 案件一覧"
        action={
          canRegister ? (
            <Link href="/projects/new">
              <Button size="sm">新規案件登録</Button>
            </Link>
          ) : undefined
        }
      >
        {isLoading && !data ? (
          <TableSkeleton rows={6} cols={7} />
        ) : (
          <DataTable
            columns={[
              { key: "name", label: "案件名" },
              { key: "customer", label: "顧客" },
              { key: "address", label: "現場住所" },
              { key: "sales", label: "受注金額" },
              { key: "cost", label: "原価" },
              { key: "gross", label: "粗利" },
              { key: "status", label: "状態" },
            ]}
            rows={projects.map((p) => ({
              name: p.name,
              customer: p.customerName,
              address: p.siteAddress,
              sales: p.salesAmount != null ? formatYen(p.salesAmount) : "—",
              cost: p.costAmount != null ? formatYen(p.costAmount) : "—",
              gross: p.grossProfit != null ? formatYen(p.grossProfit) : "—",
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
