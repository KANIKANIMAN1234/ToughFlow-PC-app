"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export default function MapPage() {
  const { user, authLoading } = useAuthGuard();

  if (authLoading || !user) {
    return (
      <AppShell title="地図" breadcrumbs={["ToughFlow", "地図"]}>
        <Card title="読み込み中">
          <p className="text-caption text-apple-glyph">読み込み中…</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="地図" breadcrumbs={["ToughFlow", "地図"]}>
      <Card title="地図">
        <p className="text-caption text-apple-glyph">
          顧客・案件の現場位置を地図上に表示する画面です（Google Maps 連携は今後実装予定）。
        </p>
      </Card>
    </AppShell>
  );
}
