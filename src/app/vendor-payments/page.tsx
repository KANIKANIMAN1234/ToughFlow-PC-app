"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { useAuth } from "@/contexts/AuthContext";
import { api, formatDate, formatYen } from "@/lib/utils";
import type { VendorPayment } from "@/lib/types";

export default function VendorPaymentsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [unpaidOnly, setUnpaidOnly] = useState(true);

  const load = useCallback(async () => {
    const data = await api.get<{ payments: VendorPayment[] }>(
      `/api/vendor-payments?unpaidOnly=${unpaidOnly}`
    );
    setPayments(data.payments);
  }, [unpaidOnly]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function markPaid(id: string) {
    await api.patch("/api/vendor-payments", { id, status: "paid" });
    await load();
  }

  if (loading || !user) return null;

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

  return (
    <AppShell title="支払いリスト" breadcrumbs={["ToughFlow", "支払精算"]}>
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={unpaidOnly}
            onChange={(e) => setUnpaidOnly(e.target.checked)}
          />
          未払のみ表示
        </label>
      </div>
      <Card title="SC-080 事務向け支払いリスト">
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
              <Badge tone={statusTone(p.status)}>{statusLabel(p.status)}</Badge>
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
      </Card>
    </AppShell>
  );
}
