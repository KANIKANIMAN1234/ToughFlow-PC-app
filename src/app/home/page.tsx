"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) return null;

  const cards = [
    { href: "/expenses", label: "立替承認待ち", value: "2件", desc: "SC-022" },
    { href: "/daily-reports", label: "作業日報", value: "1件", desc: "SC-031" },
    { href: "/dispatch", label: "本日の配車", value: "1件", desc: "SC-070" },
    { href: "/vendor-payments", label: "未払い支払", value: "1件", desc: "SC-080" },
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
