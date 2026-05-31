"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { api, formatDate, formatYen } from "@/lib/utils";
import type { DailyReport } from "@/lib/types";

export default function DailyReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [report, setReport] = useState<DailyReport | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (id) {
      api
        .get<{ report: DailyReport }>(`/api/daily-reports?id=${id}`)
        .then((d) => setReport(d.report));
    }
  }, [id]);

  if (loading || !user || !report) return null;

  const c = report.content;

  return (
    <AppShell
      title="作業日報詳細"
      breadcrumbs={["ToughFlow", "作業日報", report.content.billingClient]}
    >
      <div className="grid grid-cols-3 gap-6">
        <Card title="基本情報" className="col-span-2">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-slate-500">請求先</dt>
              <dd className="font-medium">{c.billingClient}</dd>
            </div>
            <div>
              <dt className="text-slate-500">作業日</dt>
              <dd className="font-medium">{formatDate(c.workDateStart)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">納入先</dt>
              <dd className="font-medium">{c.delivery.company}</dd>
            </div>
            <div>
              <dt className="text-slate-500">担当</dt>
              <dd className="font-medium">{c.reporterName}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-slate-500">備考</dt>
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
          <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed bg-slate-50 text-sm text-slate-400">
            IMG_5182 レイアウト PDF プレビュー（本番実装）
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
