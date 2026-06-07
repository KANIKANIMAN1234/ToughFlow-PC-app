"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export default function CustomersPage() {
  const { user, authLoading } = useAuthGuard();

  if (authLoading || !user) {
    return (
      <AppShell title="顧客リスト" breadcrumbs={["ToughFlow", "顧客リスト"]}>
        <Card title="読み込み中">
          <p className="text-caption text-apple-glyph">読み込み中…</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="顧客リスト" breadcrumbs={["ToughFlow", "顧客リスト"]}>
      <Card title="顧客リスト">
        <p className="text-caption text-apple-glyph">
          顧客マスタの一覧・検索画面です（今後実装予定）。
        </p>
      </Card>
    </AppShell>
  );
}
