"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/utils";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [counts, setCounts] = useState({
    expenses: 0,
    dailyReports: 0,
    dispatch: 0,
    vendorPayments: 0,
  });

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get<{ expenses: unknown[] }>("/api/expenses?status=submitted"),
      api.get<{ reports: unknown[] }>("/api/daily-reports"),
      api.get<{ dispatches: unknown[] }>("/api/dispatches?tab=today"),
      api.get<{ payments: unknown[] }>("/api/vendor-payments?unpaidOnly=true"),
    ])
      .then(([exp, dr, dsp, vp]) => {
        setCounts({
          expenses: exp.expenses.length,
          dailyReports: dr.reports.length,
          dispatch: dsp.dispatches.length,
          vendorPayments: vp.payments.length,
        });
      })
      .catch(() => {
        /* 集計失敗時は 0 件表示 */
      });
  }, [user]);

  if (loading || !user) return null;

  const cards = [
    {
      href: "/expenses",
      label: "立替承認待ち",
      value: `${counts.expenses}件`,
      desc: "SC-022",
    },
    {
      href: "/daily-reports",
      label: "作業日報",
      value: `${counts.dailyReports}件`,
      desc: "SC-031",
    },
    {
      href: "/dispatch",
      label: "本日の配車",
      value: `${counts.dispatch}件`,
      desc: "SC-070",
    },
    {
      href: "/vendor-payments",
      label: "未払い支払",
      value: `${counts.vendorPayments}件`,
      desc: "SC-080",
    },
  ];

  return (
    <AppShell title="ホーム" breadcrumbs={["ToughFlow", "ホーム"]}>
      <p className="mb-6 text-slate-600">
        {user.name} さん、お疲れ様です。本日の業務サマリーです。
      </p>
      <div className="grid grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href}>
            <Card className="transition-shadow hover:shadow-md">
              <p className="text-sm text-slate-500">{c.label}</p>
              <p className="mt-2 text-3xl font-bold text-brand-700">{c.value}</p>
              <p className="mt-1 text-xs text-slate-400">{c.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
      <Card title="クイックリンク" className="mt-6">
        <div className="flex gap-3">
          <Link href="/projects" className="text-sm text-brand-600 hover:underline">
            案件一覧
          </Link>
          {user.role === "admin" && (
            <Link href="/settings" className="text-sm text-brand-600 hover:underline">
              管理者設定
            </Link>
          )}
        </div>
      </Card>
    </AppShell>
  );
}
