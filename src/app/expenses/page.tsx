"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { api, formatDate, formatYen } from "@/lib/utils";
import type { Expense } from "@/lib/types";

export default function ExpensesPage() {
  const { user, authLoading } = useAuthGuard();
  const { data, isLoading, mutate, isValidating, error } = useApi<{
    expenses: Expense[];
  }>(user ? "/api/expenses?status=submitted" : null, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  });

  const expenses = data?.expenses ?? [];

  async function handleStatus(id: string, status: "approved" | "rejected") {
    await api.patch("/api/expenses", { id, status });
    await mutate();
  }

  if (authLoading || !user) {
    return (
      <AppShell
        title="立替承認一覧"
        breadcrumbs={["ToughFlow", "立替精算", "承認"]}
      >
        <TableSkeleton rows={6} cols={7} />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="立替承認一覧"
      breadcrumbs={["ToughFlow", "立替精算", "承認"]}
    >
      <Card
        title="提出済み経費（SC-022）"
        action={
          <span className="text-caption text-apple-glyph">
            {isValidating ? "更新中…" : "5秒ごとに自動更新"}
          </span>
        }
      >
        {error && (
          <p className="mb-4 text-caption text-red-600">
            取得に失敗しました: {error.message}
          </p>
        )}
        {isLoading && !data ? (
          <TableSkeleton rows={6} cols={7} />
        ) : (
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
        )}
      </Card>
    </AppShell>
  );
}
