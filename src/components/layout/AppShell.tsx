"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  FileText,
  Home,
  Receipt,
  Settings,
  Truck,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

const navItems: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}[] = [
  { href: "/home", label: "ホーム", icon: Home },
  { href: "/expenses", label: "立替承認", icon: Receipt, roles: ["admin", "office"] },
  { href: "/daily-reports", label: "作業日報", icon: FileText },
  { href: "/projects", label: "案件", icon: ClipboardList },
  { href: "/dispatch", label: "配車", icon: Truck, roles: ["admin", "office", "manager"] },
  { href: "/vendor-payments", label: "支払精算", icon: Wallet, roles: ["admin", "office"] },
  { href: "/settings", label: "設定", icon: Settings, roles: ["admin"] },
];

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

  const visibleNav = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-sidebar flex-col border-r border-surface-border bg-white">
        <div className="flex h-14 items-center border-b border-surface-border px-5">
          <span className="apple-heading text-body">ToughFlow</span>
          <span className="ml-2 rounded-pill bg-apple-section px-2 py-0.5 text-[10px] font-normal text-apple-glyph">
            PC
          </span>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {visibleNav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-body font-normal transition-colors",
                  active
                    ? "bg-apple-section text-apple-text"
                    : "text-apple-glyph hover:bg-apple-section/70 hover:text-apple-text"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-surface-border p-4 text-nav-link">
          <p className="font-normal text-apple-text">{user?.name}</p>
          <p className="text-apple-glyph">{user?.tenantName}</p>
        </div>
      </aside>

      <div className="ml-sidebar flex min-h-screen flex-1 flex-col">
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
