import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  ClipboardList,
  Clock,
  FileText,
  Home,
  Map,
  MapPin,
  Receipt,
  Settings,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import type { PermissionCode } from "./check";

export type NavItemDef = {
  href: string;
  label: string;
  icon?: LucideIcon;
  permissions?: PermissionCode[];
};

export type NavGroupDef = {
  id: string;
  label: string;
  children: NavItemDef[];
};

export const PC_NAV_HOME: NavItemDef = {
  href: "/home",
  label: "ホーム",
  icon: Home,
};

export const PC_NAV_GROUPS: NavGroupDef[] = [
  {
    id: "customer",
    label: "顧客対応",
    children: [
      {
        href: "/projects",
        label: "案件",
        icon: ClipboardList,
        permissions: ["project_list_other"],
      },
      {
        href: "/site-surveys",
        label: "現場調査結果",
        icon: MapPin,
        permissions: ["site_survey_register", "site_survey_view_shared"],
      },
      {
        href: "/field-calendar",
        label: "現場カレンダー",
        icon: Calendar,
        permissions: ["dispatch_list_view", "dispatch_view"],
      },
      {
        href: "/daily-reports",
        label: "作業日報",
        icon: FileText,
        permissions: ["daily_report_view_all", "daily_report_register"],
      },
      {
        href: "/dispatch",
        label: "配車",
        icon: Truck,
        permissions: ["dispatch_list_view", "dispatch_view"],
      },
    ],
  },
  {
    id: "customer_mgmt",
    label: "顧客管理",
    children: [
      {
        href: "/customers",
        label: "顧客リスト",
        icon: Users,
        permissions: ["project_list_other"],
      },
      {
        href: "/map",
        label: "地図",
        icon: Map,
        permissions: ["project_list_other"],
      },
    ],
  },
  {
    id: "office",
    label: "事務処理",
    children: [
      {
        href: "/expenses",
        label: "立替承認",
        icon: Receipt,
        permissions: ["expense_approve"],
      },
      {
        href: "/vendor-payments",
        label: "支払精算",
        icon: Wallet,
        permissions: ["vendor_payment_view"],
      },
      {
        href: "/attendance/history",
        label: "勤怠履歴",
        icon: Clock,
        permissions: ["attendance_register", "attendance_view_all"],
      },
    ],
  },
];

export const PC_NAV_SETTINGS: NavItemDef = {
  href: "/settings",
  label: "設定",
  icon: Settings,
  permissions: ["admin_settings"],
};

/** @deprecated AppShell は PC_NAV_STRUCTURE を使用 */
export const PC_NAV_ITEMS: NavItemDef[] = [
  PC_NAV_HOME,
  ...PC_NAV_GROUPS.flatMap((g) => g.children),
  PC_NAV_SETTINGS,
];

function canAccessItem(
  item: NavItemDef,
  accessMap: Record<string, import("@/lib/types").AccessLevel>
): boolean {
  if (!item.permissions?.length) return true;
  return item.permissions.some((code) => {
    const level = accessMap[code] ?? "deny";
    return level === "allow" || level === "conditional";
  });
}

export function filterNavByAccess(
  items: NavItemDef[],
  accessMap: Record<string, import("@/lib/types").AccessLevel>
): NavItemDef[] {
  return items.filter((item) => canAccessItem(item, accessMap));
}

export function filterNavGroupsByAccess(
  groups: NavGroupDef[],
  accessMap: Record<string, import("@/lib/types").AccessLevel>
): NavGroupDef[] {
  return groups
    .map((group) => ({
      ...group,
      children: group.children.filter((item) => canAccessItem(item, accessMap)),
    }))
    .filter((group) => group.children.length > 0);
}

export type PcNavStructure = {
  home: NavItemDef;
  groups: NavGroupDef[];
  settings: NavItemDef | null;
};

export function buildPcNavStructure(
  accessMap: Record<string, import("@/lib/types").AccessLevel>
): PcNavStructure {
  const settings = canAccessItem(PC_NAV_SETTINGS, accessMap)
    ? PC_NAV_SETTINGS
    : null;
  return {
    home: PC_NAV_HOME,
    groups: filterNavGroupsByAccess(PC_NAV_GROUPS, accessMap),
    settings,
  };
}

export function findActiveGroupId(
  pathname: string,
  groups: NavGroupDef[]
): string | null {
  for (const group of groups) {
    if (
      group.children.some(
        (item) =>
          pathname === item.href || pathname.startsWith(`${item.href}/`)
      )
    ) {
      return group.id;
    }
  }
  return null;
}
