"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { FolderDesignPanel } from "@/components/admin/FolderDesignPanel";
import { MasterManager } from "@/components/admin/MasterManager";
import { PartnerSharePanel } from "@/components/admin/PartnerSharePanel";
import { PermissionManager } from "@/components/admin/PermissionManager";
import { UserRoleManager } from "@/components/admin/UserRoleManager";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";

const TABS = [
  { id: "masters", label: "マスタ管理" },
  { id: "users", label: "ユーザー管理" },
  { id: "folder", label: "フォルダ設計" },
  { id: "permissions", label: "権限管理" },
  { id: "partner", label: "パートナー共有" },
] as const;

type SettingsTab = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const { user, loading, allowed } = usePermissionGuard("admin_settings");
  const [activeTab, setActiveTab] = useState<SettingsTab>("masters");

  if (loading || !user || !allowed) return null;

  return (
    <AppShell title="管理者設定" breadcrumbs={["ToughFlow", "設定"]}>
      <div className="mb-6 flex gap-2 border-b border-surface-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={
              activeTab === tab.id
                ? "border-b-2 border-brand-600 px-4 py-2 text-caption font-medium text-brand-600"
                : "px-4 py-2 text-caption text-apple-glyph hover:text-apple-text"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === "masters" && <MasterManager />}
      {activeTab === "users" && <UserRoleManager />}
      {activeTab === "folder" && <FolderDesignPanel />}
      {activeTab === "permissions" && <PermissionManager />}
      {activeTab === "partner" && <PartnerSharePanel />}
    </AppShell>
  );
}
