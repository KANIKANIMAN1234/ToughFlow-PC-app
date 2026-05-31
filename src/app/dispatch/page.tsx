"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { useAuth } from "@/contexts/AuthContext";
import { api, formatDate } from "@/lib/utils";
import type { DispatchRow } from "@/lib/types";

export default function DispatchPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"today" | "future">("today");
  const [rows, setRows] = useState<DispatchRow[]>([]);

  const load = useCallback(async () => {
    const data = await api.get<{ dispatches: DispatchRow[] }>(
      `/api/dispatches?tab=${tab}`
    );
    setRows(data.dispatches);
  }, [tab]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) void load();
  }, [user, tab, load]);

  if (loading || !user) return null;

  return (
    <AppShell title="配車予定一覧" breadcrumbs={["ToughFlow", "配車"]}>
      <div className="mb-4 flex gap-2">
        {(["today", "future"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === t
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-surface-border"
            }`}
          >
            {t === "today" ? "当日" : "この先（未来）"}
          </button>
        ))}
      </div>
      <Card title="SC-070 配車予定一覧">
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
      </Card>
    </AppShell>
  );
}
