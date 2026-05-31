"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { useAuth } from "@/contexts/AuthContext";
import { api, formatDate } from "@/lib/utils";
import type { DailyReport } from "@/lib/types";

export default function DailyReportsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<DailyReport[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    api.get<{ reports: DailyReport[] }>("/api/daily-reports").then((d) => {
      setReports(d.reports);
    });
  }, []);

  if (loading || !user) return null;

  return (
    <AppShell title="作業日報一覧" breadcrumbs={["ToughFlow", "作業日報"]}>
      <Card title="SC-031 作業日報一覧">
        <DataTable
          columns={[
            { key: "date", label: "作業日" },
            { key: "client", label: "請求先" },
            { key: "project", label: "案件" },
            { key: "user", label: "担当" },
            { key: "status", label: "状態" },
            { key: "link", label: "" },
          ]}
          rows={reports.map((r) => ({
            date: formatDate(r.content.workDateStart),
            client: r.content.billingClient,
            project: r.projectName,
            user: r.userName,
            status: (
              <Badge tone={r.status === "submitted" ? "success" : "default"}>
                {r.status}
              </Badge>
            ),
            link: (
              <Link
                href={`/daily-reports/${r.id}`}
                className="text-brand-600 hover:underline"
              >
                詳細
              </Link>
            ),
          }))}
        />
      </Card>
    </AppShell>
  );
}
