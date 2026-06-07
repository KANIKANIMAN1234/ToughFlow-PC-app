"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { DetailSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { formatDate, formatYen } from "@/lib/utils";
import type { DailyReport } from "@/lib/types";

export default function DailyReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, authLoading } = useAuthGuard();
  const { data, isLoading } = useApi<{ report: DailyReport }>(
    user && id ? `/api/daily-reports?id=${id}` : null
  );

  const report = data?.report;

  if (authLoading || !user) {
    return (
      <AppShell title="作業日報詳細" breadcrumbs={["ToughFlow", "作業日報"]}>
        <DetailSkeleton />
      </AppShell>
    );
  }

  if (isLoading && !report) {
    return (
      <AppShell title="作業日報詳細" breadcrumbs={["ToughFlow", "作業日報"]}>
        <DetailSkeleton />
      </AppShell>
    );
  }

  if (!report) return null;

  const c = report.content;

  return (
    <AppShell
      title="作業日報詳細"
      breadcrumbs={["ToughFlow", "作業日報", report.content.billingClient]}
    >
      <div className="grid grid-cols-3 gap-6">
        <Card title="基本情報" className="col-span-2">
          <dl className="grid grid-cols-2 gap-4 text-caption">
            <div>
              <dt className="text-apple-glyph">請求先</dt>
              <dd className="font-normal text-apple-text">{c.billingClient}</dd>
            </div>
            <div>
              <dt className="text-apple-glyph">作業日</dt>
              <dd className="font-normal text-apple-text">
                {formatDate(c.workDateStart)}
              </dd>
            </div>
            <div>
              <dt className="text-apple-glyph">納入先</dt>
              <dd className="font-normal text-apple-text">{c.delivery.company}</dd>
            </div>
            <div>
              <dt className="text-apple-glyph">担当</dt>
              <dd className="font-normal text-apple-text">{c.reporterName}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-apple-glyph">備考</dt>
              <dd className="mt-1 whitespace-pre-wrap">{c.remarks}</dd>
            </div>
          </dl>
        </Card>
        <Card title="経費">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>高速代</dt>
              <dd>{c.costs.toll ? formatYen(c.costs.toll) : "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt>ガソリン代</dt>
              <dd>{c.costs.gasoline ? formatYen(c.costs.gasoline) : "—"}</dd>
            </div>
          </dl>
        </Card>
        <Card title="機械" className="col-span-3">
          <ul className="text-sm">
            {c.machines.map((m, i) => (
              <li key={i}>
                {m.name} / {m.maker} / {m.model} × {m.qty}
              </li>
            ))}
          </ul>
        </Card>
        <Card title="PDF プレビュー" className="col-span-3">
          <div className="mb-3 flex gap-3">
            <a
              href={`/api/daily-reports/${id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg bg-apple-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              PDF を開く
            </a>
            <a
              href={`/api/daily-reports/${id}/pdf`}
              download
              className="inline-flex items-center rounded-lg border border-surface-border px-4 py-2 text-sm font-medium text-apple-text hover:bg-apple-section"
            >
              PDF をダウンロード
            </a>
          </div>
          <iframe
            title="作業日報プレビュー"
            src={`/api/daily-reports/${id}/preview`}
            className="h-[720px] w-full rounded-card border border-surface-border bg-white"
          />
        </Card>
      </div>
    </AppShell>
  );
}
