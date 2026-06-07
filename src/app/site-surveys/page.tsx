"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { formatDate } from "@/lib/utils";
import type { SiteSurvey } from "@/lib/types";

function statusLabel(status: SiteSurvey["status"]) {
  return status === "published" ? "確定" : "下書き";
}

function statusTone(status: SiteSurvey["status"]) {
  return status === "published" ? "success" : ("default" as const);
}

export default function SiteSurveysPage() {
  const { user, authLoading } = useAuthGuard();
  const { data, isLoading } = useApi<{ surveys: SiteSurvey[] }>(
    user ? "/api/site-surveys" : null
  );

  const surveys = data?.surveys ?? [];

  if (authLoading || !user) {
    return (
      <AppShell
        title="現場調査結果一覧"
        breadcrumbs={["ToughFlow", "現場調査結果"]}
      >
        <TableSkeleton rows={6} cols={6} />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="現場調査結果一覧"
      breadcrumbs={["ToughFlow", "現場調査結果"]}
    >
      <Card title="SC-041 現場調査結果一覧">
        {isLoading && !data ? (
          <TableSkeleton rows={6} cols={6} />
        ) : (
          <DataTable
            columns={[
              { key: "date", label: "調査日" },
              { key: "customer", label: "顧客名" },
              { key: "project", label: "案件" },
              { key: "user", label: "担当" },
              { key: "status", label: "状態" },
              { key: "link", label: "" },
            ]}
            rows={surveys.map((s) => ({
              date: formatDate(s.content.surveyDate),
              customer: s.content.customerName,
              project: s.projectName,
              user: s.userName,
              status: (
                <Badge tone={statusTone(s.status)}>
                  {statusLabel(s.status)}
                </Badge>
              ),
              link: (
                <Link
                  href={`/site-surveys/${s.id}`}
                  className="text-brand-600 hover:underline"
                >
                  詳細
                </Link>
              ),
            }))}
          />
        )}
      </Card>
    </AppShell>
  );
}
