"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import type { DashboardSummary } from "@/lib/db/repository";

export default function HomePage() {
  const { user, authLoading } = useAuthGuard();
  const { data, isLoading } = useApi<{ summary: DashboardSummary }>(
    user ? "/api/dashboard/summary" : null
  );

  const counts = data?.summary ?? {
    expenses: 0,
    dailyReports: 0,
    dispatch: 0,
    vendorPayments: 0,
  };

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

  if (authLoading || !user) {
    return (
      <AppShell title="ホーム" breadcrumbs={["ToughFlow", "ホーム"]}>
        <CardGridSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell title="ホーム" breadcrumbs={["ToughFlow", "ホーム"]}>
      <p className="mb-6 text-body text-apple-glyph">
        {user.name} さん、お疲れ様です。本日の業務サマリーです。
      </p>
      {isLoading && !data ? (
        <CardGridSkeleton />
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {cards.map((c) => (
            <Link key={c.href} href={c.href}>
              <Card className="transition-shadow hover:shadow-apple">
                <p className="text-caption text-apple-glyph">{c.label}</p>
                <p className="mt-2 text-headline font-normal text-brand-600">
                  {c.value}
                </p>
                <p className="mt-1 text-nav-link text-apple-glyph">{c.desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <Card title="クイックリンク" className="mt-6">
        <div className="flex gap-3">
          <Link
            href="/projects"
            className="text-caption text-apple-link hover:underline focus-apple"
          >
            案件一覧
          </Link>
          {user.role === "admin" && (
            <Link
              href="/settings"
              className="text-caption text-apple-link hover:underline focus-apple"
            >
              管理者設定
            </Link>
          )}
        </div>
      </Card>
    </AppShell>
  );
}
