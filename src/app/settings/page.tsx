"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MasterManager } from "@/components/admin/MasterManager";
import { useAuth } from "@/contexts/AuthContext";

const TABS = [
  { id: "masters", label: "マスタ管理" },
  { id: "folder", label: "フォルダ設計" },
  { id: "permissions", label: "権限管理" },
  { id: "partner", label: "パートナー共有" },
] as const;

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) router.replace("/login");
      else if (user.role !== "admin") router.replace("/home");
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== "admin") return null;

  return (
    <AppShell title="管理者設定" breadcrumbs={["ToughFlow", "設定"]}>
      <div className="mb-6 flex gap-2 border-b border-surface-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`border-b-2 px-4 py-2 text-caption font-normal focus-apple ${
              tab.id === "masters"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-apple-glyph"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <MasterManager />

      <p className="mt-8 text-nav-link text-apple-glyph">
        フォルダ設計・権限管理・パートナー共有タブは P2 で実装予定（SC-060）
      </p>
    </AppShell>
  );
}
