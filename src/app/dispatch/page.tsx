"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { formatDate } from "@/lib/utils";
import type { DispatchRow } from "@/lib/types";

export default function DispatchPage() {
  const { user, authLoading } = useAuthGuard();
  const [tab, setTab] = useState<"today" | "future">("today");
  const { data, isLoading } = useApi<{ dispatches: DispatchRow[] }>(
    user ? `/api/dispatches?tab=${tab}` : null
  );

  const rows = data?.dispatches ?? [];

  if (authLoading || !user) {
    return (
      <AppShell title="配車予定一覧" breadcrumbs={["ToughFlow", "配車"]}>
        <TableSkeleton rows={6} cols={8} />
      </AppShell>
    );
  }

  return (
    <AppShell title="配車予定一覧" breadcrumbs={["ToughFlow", "配車"]}>
      <div className="mb-4 flex gap-2">
        {(["today", "future"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-pill px-4 py-2 text-caption font-normal focus-apple ${
              tab === t
                ? "bg-brand-600 text-white"
                : "bg-white text-apple-glyph ring-1 ring-surface-border"
            }`}
          >
            {t === "today" ? "当日" : "この先（未来）"}
          </button>
        ))}
      </div>
      <Card title="SC-070 配車予定一覧">
        {isLoading && !data ? (
          <TableSkeleton rows={6} cols={8} />
        ) : (
          <DataTable
            columns={[
              { key: "date", label: "日付" },
              { key: "customer", label: "顧客/現場" },
              { key: "assignee", label: "担当" },
              { key: "vehicles", label: "車両" },
              { key: "workers", label: "人数" },
              { key: "status", label: "状態" },
              { key: "source", label: "来源" },
              { key: "link", label: "" },
            ]}
            rows={rows.map((r) => ({
              date: formatDate(r.dispatchDate),
              customer: `${r.customerName} / ${r.siteName}`,
              assignee: r.assignee,
              vehicles: r.vehicles,
              workers: `${r.workers}名`,
              status: (
                <Badge tone={r.status === "confirmed" ? "success" : "warning"}>
                  {r.status === "confirmed" ? "確定" : "下書き"}
                </Badge>
              ),
              source: r.source === "site_survey" ? "下見済" : "手入力",
              link: (
                <Link
                  href={`/dispatch/${r.id}`}
                  className="text-brand-600 hover:underline"
                >
                  編集
                </Link>
              ),
            }))}
          />
        )}
      </Card>
    </AppShell>
  );
}
