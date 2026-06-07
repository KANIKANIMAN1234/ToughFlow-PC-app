"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { filterNavByAccess, PC_NAV_ITEMS } from "@/lib/permissions/nav";
import { useState } from "react";

export function AppShell({
  children,
  title,
  breadcrumbs,
}: {
  children: React.ReactNode;
  title: string;
  breadcrumbs?: string[];
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { accessMap, loading: permLoading } = usePermissions();
  const [collapsed, setCollapsed] = useState(false);

  const visibleNav = permLoading
    ? PC_NAV_ITEMS.filter((item) => item.href === "/home")
    : filterNavByAccess(PC_NAV_ITEMS, accessMap);

  return (
    <div className="flex min-h-screen bg-surface">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-20 flex flex-col border-r border-surface-border bg-white transition-all duration-200",
          collapsed ? "w-16" : "w-sidebar"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-surface-border px-3">
          {!collapsed && (
            <>
              <span className="apple-heading text-body">ToughFlow</span>
              <span className="ml-2 rounded-pill bg-apple-section px-2 py-0.5 text-[10px] font-normal text-apple-glyph">
                PC
              </span>
            </>
          )}
          <button
            type="button"
            aria-label={collapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
            onClick={() => setCollapsed((v) => !v)}
            className={cn(
              "rounded-lg p-2 text-apple-glyph hover:bg-apple-section hover:text-apple-text focus-apple",
              collapsed && "mx-auto"
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {visibleNav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-body font-normal transition-colors",
                  active
                    ? "bg-apple-section text-apple-text"
                    : "text-apple-glyph hover:bg-apple-section/70 hover:text-apple-text",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && label}
              </Link>
            );
          })}
        </nav>
        {!collapsed && (
          <div className="border-t border-surface-border p-4 text-nav-link">
            <p className="font-normal text-apple-text">{user?.name}</p>
            <p className="text-apple-glyph">{user?.tenantName}</p>
          </div>
        )}
      </aside>

      <div
        className={cn(
          "flex min-h-screen flex-1 flex-col transition-all duration-200",
          collapsed ? "ml-16" : "ml-sidebar"
        )}
      >
        <header className="glass-nav sticky top-0 z-10 flex h-14 items-center justify-between px-6">
          <div>
            {breadcrumbs && breadcrumbs.length > 0 && (
              <p className="text-nav-link text-apple-glyph">
                {breadcrumbs.join(" / ")}
              </p>
            )}
            <h1 className="apple-heading text-body">{title}</h1>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="text-caption text-apple-link hover:underline focus-apple"
          >
            ログアウト
          </button>
        </header>
        <main className="mx-auto w-full max-w-content flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
