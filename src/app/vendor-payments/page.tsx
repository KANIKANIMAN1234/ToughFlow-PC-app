"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { api, formatDate, formatYen } from "@/lib/utils";
import type { VendorPayment } from "@/lib/types";

export default function VendorPaymentsPage() {
  const { user, authLoading } = useAuthGuard();
  const [unpaidOnly, setUnpaidOnly] = useState(true);
  const { data, isLoading, mutate } = useApi<{ payments: VendorPayment[] }>(
    user ? `/api/vendor-payments?unpaidOnly=${unpaidOnly}` : null
  );

  const payments = data?.payments ?? [];

  async function markPaid(id: string) {
    await api.patch("/api/vendor-payments", { id, status: "paid" });
    await mutate();
  }

  const statusLabel = (s: VendorPayment["status"]) => {
    if (s === "paid") return "支払完了";
    if (s === "confirmed") return "確定";
    return "下書き";
  };

  const statusTone = (s: VendorPayment["status"]) => {
    if (s === "paid") return "success" as const;
    if (s === "confirmed") return "warning" as const;
    return "default" as const;
  };

  if (authLoading || !user) {
    return (
      <AppShell title="支払いリスト" breadcrumbs={["ToughFlow", "支払精算"]}>
        <TableSkeleton rows={6} cols={7} />
      </AppShell>
    );
  }

  return (
    <AppShell title="支払いリスト" breadcrumbs={["ToughFlow", "支払精算"]}>
      <div className="mb-4">
        <label className="flex items-center gap-2 text-caption">
          <input
            type="checkbox"
            checked={unpaidOnly}
            onChange={(e) => setUnpaidOnly(e.target.checked)}
          />
          未払のみ表示
        </label>
      </div>
      <Card title="SC-080 事務向け支払いリスト">
        {isLoading && !data ? (
          <TableSkeleton rows={6} cols={7} />
        ) : (
          <DataTable
            columns={[
              { key: "project", label: "案件" },
              { key: "sales", label: "受注金額" },
              { key: "payee", label: "支払先" },
              { key: "amount", label: "支払金額" },
              { key: "due", label: "期日" },
              { key: "status", label: "状態" },
              { key: "action", label: "操作" },
            ]}
            rows={payments.map((p) => ({
              project: p.projectName,
              sales: formatYen(p.salesAmount),
              payee: p.payeeName,
              amount: formatYen(p.amount),
              due: p.dueDate ? formatDate(p.dueDate) : "—",
              status: (
                <Badge tone={statusTone(p.status)}>
                  {statusLabel(p.status)}
                </Badge>
              ),
              action:
                p.status === "confirmed" ? (
                  <Button size="sm" onClick={() => markPaid(p.id)}>
                    支払完了
                  </Button>
                ) : (
                  "—"
                ),
            }))}
          />
        )}
      </Card>
    </AppShell>
  );
}
