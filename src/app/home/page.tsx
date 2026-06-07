"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { usePermissions } from "@/hooks/usePermissions";
import type { DashboardSummary } from "@/lib/db/repository";

type OfficeReminders = {
  pendingExpenseApprovals: number;
  draftDailyReports: number;
  unpaidVendorPayments: number;
};

export default function HomePage() {
  const { user, authLoading } = useAuthGuard();
  const { canAccess } = usePermissions();
  const { data, isLoading } = useApi<{ summary: DashboardSummary }>(
    user ? "/api/dashboard/summary" : null
  );
  const { data: reminderData } = useApi<{ reminders: OfficeReminders }>(
    user && canAccess("expense_approve") ? "/api/reminders" : null
  );

  const counts = data?.summary ?? {
    expenses: 0,
    dailyReports: 0,
    dispatch: 0,
    vendorPayments: 0,
  };

  const reminders = reminderData?.reminders ?? {
    pendingExpenseApprovals: 0,
    draftDailyReports: 0,
    unpaidVendorPayments: 0,
  };
  const hasReminders =
    reminders.pendingExpenseApprovals > 0 ||
    reminders.draftDailyReports > 0 ||
    reminders.unpaidVendorPayments > 0;

  const cards = [
    {
      href: "/expenses",
      label: "立替承認待ち",
      value: `${counts.expenses}件`,
      desc: "SC-022",
      permission: "expense_approve",
    },
    {
      href: "/daily-reports",
      label: "作業日報",
      value: `${counts.dailyReports}件`,
      desc: "SC-031",
      permission: "daily_report_view_all",
    },
    {
      href: "/dispatch",
      label: "本日の配車",
      value: `${counts.dispatch}件`,
      desc: "SC-070",
      permission: "dispatch_list_view",
    },
    {
      href: "/vendor-payments",
      label: "未払い支払",
      value: `${counts.vendorPayments}件`,
      desc: "SC-080",
      permission: "vendor_payment_view",
    },
  ].filter((c) => canAccess(c.permission));

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

      {canAccess("expense_approve") && hasReminders && (
        <Card title="要対応" className="mb-6 border-amber-200 bg-amber-50/50">
          <ul className="space-y-2 text-caption text-apple-text">
            {reminders.pendingExpenseApprovals > 0 && (
              <li>
                <Link href="/expenses" className="text-apple-link hover:underline">
                  立替承認待ち {reminders.pendingExpenseApprovals} 件
                </Link>
              </li>
            )}
            {reminders.draftDailyReports > 0 && (
              <li>
                <Link
                  href="/daily-reports"
                  className="text-apple-link hover:underline"
                >
                  下書き日報 {reminders.draftDailyReports} 件
                </Link>
              </li>
            )}
            {reminders.unpaidVendorPayments > 0 && (
              <li>
                <Link
                  href="/vendor-payments"
                  className="text-apple-link hover:underline"
                >
                  支払確認待ち {reminders.unpaidVendorPayments} 件
                </Link>
              </li>
            )}
          </ul>
        </Card>
      )}

      {isLoading && !data ? (
        <CardGridSkeleton />
      ) : (
        <div
          className={`grid gap-4 ${
            cards.length >= 4
              ? "grid-cols-4"
              : cards.length === 3
                ? "grid-cols-3"
                : cards.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-1"
          }`}
        >
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
          {canAccess("project_list_other") && (
            <Link
              href="/projects"
              className="text-caption text-apple-link hover:underline focus-apple"
            >
              案件一覧
            </Link>
          )}
          {canAccess("admin_settings") && (
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
