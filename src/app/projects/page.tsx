"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { useAuth } from "@/contexts/AuthContext";
import { api, formatYen } from "@/lib/utils";
import type { Project } from "@/lib/types";

export default function ProjectsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    api.get<{ projects: Project[] }>("/api/projects").then((d) => {
      setProjects(d.projects);
    });
  }, []);

  if (loading || !user) return null;

  return (
    <AppShell title="案件一覧" breadcrumbs={["ToughFlow", "案件"]}>
      <Card title="SC-050 案件一覧">
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
      </Card>
    </AppShell>
  );
}
