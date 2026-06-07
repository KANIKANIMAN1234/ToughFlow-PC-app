"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export default function FieldCalendarPage() {
  const { user, authLoading } = useAuthGuard();

  if (authLoading || !user) {
    return (
      <AppShell title="現場カレンダー" breadcrumbs={["ToughFlow", "現場カレンダー"]}>
        <Card title="読み込み中">
          <p className="text-caption text-apple-glyph">読み込み中…</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="現場カレンダー" breadcrumbs={["ToughFlow", "現場カレンダー"]}>
      <Card title="現場カレンダー">
        <p className="text-caption text-apple-glyph">
          配車・作業予定をカレンダー表示する画面です（Google Calendar 連携は今後実装予定）。
        </p>
      </Card>
    </AppShell>
  );
}
