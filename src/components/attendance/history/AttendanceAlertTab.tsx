"use client";

import { Card } from "@/components/ui/Card";

type Props = {
  enabled: boolean;
};

export function AttendanceAlertTab({ enabled }: Props) {
  if (!enabled) return null;

  return (
    <Card title="勤務アラート">
      <p className="mb-4 text-caption text-apple-glyph">
        就業時間の超過・36協定アラート等を表示します。集計ロジック実装後に有効になります。
      </p>
      <div className="rounded-xl border border-dashed border-surface-border bg-apple-section/40 px-6 py-12 text-center text-caption text-apple-glyph">
        アラート対象の勤務データはありません
      </div>
    </Card>
  );
}
