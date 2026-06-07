import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  FileText,
  Home,
  Receipt,
  Settings,
  Truck,
  Wallet,
} from "lucide-react";
import type { PermissionCode } from "./check";

export type NavItemDef = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** 未指定=全員可。指定時はいずれかの権限が allow/conditional なら表示 */
  permissions?: PermissionCode[];
};

export const PC_NAV_ITEMS: NavItemDef[] = [
  { href: "/home", label: "ホーム", icon: Home },
  {
    href: "/expenses",
    label: "立替承認",
    icon: Receipt,
    permissions: ["expense_approve"],
  },
  {
    href: "/daily-reports",
    label: "作業日報",
    icon: FileText,
    permissions: ["daily_report_view_all", "daily_report_register"],
  },
  {
    href: "/projects",
    label: "案件",
    icon: ClipboardList,
    permissions: ["project_list_other"],
  },
  {
    href: "/dispatch",
    label: "配車",
    icon: Truck,
    permissions: ["dispatch_list_view", "dispatch_view"],
  },
  {
    href: "/vendor-payments",
    label: "支払精算",
    icon: Wallet,
    permissions: ["vendor_payment_view"],
  },
  {
    href: "/settings",
    label: "設定",
    icon: Settings,
    permissions: ["admin_settings"],
  },
];

export function filterNavByAccess(
  items: NavItemDef[],
  accessMap: Record<string, import("@/lib/types").AccessLevel>
): NavItemDef[] {
  return items.filter((item) => {
    if (!item.permissions?.length) return true;
    return item.permissions.some((code) => {
      const level = accessMap[code] ?? "deny";
      return level === "allow" || level === "conditional";
    });
  });
}
