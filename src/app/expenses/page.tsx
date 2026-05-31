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
import type { Expense } from "@/lib/types";

export default function ExpensesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const load = useCallback(async () => {
    const data = await api.get<{ expenses: Expense[] }>(
      "/api/expenses?status=submitted"
    );
    setExpenses(data.expenses);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function handleStatus(id: string, status: "approved" | "rejected") {
    await api.patch("/api/expenses", { id, status });
    await load();
  }

  if (loading || !user) return null;

  return (
    <AppShell
      title="立替承認一覧"
      breadcrumbs={["ToughFlow", "立替精算", "承認"]}
    >
      <Card title="提出済み経費（SC-022）">
        <DataTable
          columns={[
            { key: "date", label: "発生日" },
            { key: "project", label: "案件" },
            { key: "user", label: "申請者" },
            { key: "category", label: "用途" },
            { key: "amount", label: "金額" },
            { key: "method", label: "入力" },
            { key: "action", label: "操作" },
          ]}
          rows={expenses.map((e) => ({
            date: formatDate(e.expenseDate),
            project: e.projectName,
            user: e.userName,
            category: e.categoryName,
            amount: formatYen(e.amount),
            method: (
              <Badge tone="info">
                {e.inputMethod === "ocr" ? "OCR" : e.inputMethod}
              </Badge>
            ),
            action: (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => handleStatus(e.id, "approved")}
                >
                  承認
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleStatus(e.id, "rejected")}
                >
                  差戻し
                </Button>
              </div>
            ),
          }))}
        />
      </Card>
    </AppShell>
  );
}
