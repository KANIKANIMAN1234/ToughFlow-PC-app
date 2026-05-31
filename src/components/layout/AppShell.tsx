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
        <div className="flex h-16 items-center border-b px-5">
          <span className="text-lg font-black text-brand-700">ToughFlow</span>
          <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            PC
          </span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {visibleNav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-4 text-xs text-slate-500">
          <p className="font-medium text-slate-700">{user?.name}</p>
          <p>{user?.tenantName}</p>
        </div>
      </aside>

      <div className="ml-sidebar flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white px-6">
          <div>
            {breadcrumbs && breadcrumbs.length > 0 && (
              <p className="text-xs text-slate-400">
                {breadcrumbs.join(" / ")}
              </p>
            )}
            <h1 className="text-lg font-bold text-slate-900">{title}</h1>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            ログアウト
          </button>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
