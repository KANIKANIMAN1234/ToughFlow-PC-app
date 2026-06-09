import type { AccessLevel, UserRole } from "@/lib/types";

export const ROLES: UserRole[] = [
  "admin",
  "office",
  "manager",
  "field",
  "partner",
];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "管理者",
  office: "事務",
  manager: "部長",
  field: "現場",
  partner: "パートナー",
};

export const ACCESS_LEVELS: AccessLevel[] = ["allow", "conditional", "deny"];

export const ACCESS_LABELS: Record<AccessLevel, string> = {
  allow: "○ 許可",
  conditional: "△ 条件付き",
  deny: "× 不可",
};

/** セキュリティ・権限設計書 §2.3 デフォルト矩阵 */
export const DEFAULT_PERMISSION_MATRIX: Record<
  string,
  Record<UserRole, AccessLevel>
> = {
  expense_register: {
    admin: "allow",
    office: "allow",
    manager: "allow",
    field: "allow",
    partner: "deny",
  },
  expense_approve: {
    admin: "allow",
    office: "allow",
    manager: "conditional",
    field: "deny",
    partner: "deny",
  },
  daily_report_view_all: {
    admin: "allow",
    office: "allow",
    manager: "conditional",
    field: "deny",
    partner: "deny",
  },
  daily_report_register: {
    admin: "allow",
    office: "allow",
    manager: "allow",
    field: "allow",
    partner: "deny",
  },
  site_survey_register: {
    admin: "allow",
    office: "allow",
    manager: "allow",
    field: "allow",
    partner: "deny",
  },
  site_survey_view_shared: {
    admin: "allow",
    office: "allow",
    manager: "allow",
    field: "allow",
    partner: "allow",
  },
  estimate_view: {
    admin: "allow",
    office: "allow",
    manager: "allow",
    field: "allow",
    partner: "deny",
  },
  admin_settings: {
    admin: "allow",
    office: "deny",
    manager: "deny",
    field: "deny",
    partner: "deny",
  },
  master_manage: {
    admin: "allow",
    office: "deny",
    manager: "deny",
    field: "deny",
    partner: "deny",
  },
  master_view: {
    admin: "allow",
    office: "allow",
    manager: "deny",
    field: "deny",
    partner: "deny",
  },
  project_list_other: {
    admin: "allow",
    office: "allow",
    manager: "conditional",
    field: "deny",
    partner: "deny",
  },
  dispatch_list_view: {
    admin: "allow",
    office: "allow",
    manager: "allow",
    field: "conditional",
    partner: "deny",
  },
  dispatch_edit: {
    admin: "allow",
    office: "allow",
    manager: "allow",
    field: "deny",
    partner: "deny",
  },
  dispatch_view: {
    admin: "allow",
    office: "allow",
    manager: "allow",
    field: "allow",
    partner: "deny",
  },
  vendor_payment_confirm: {
    admin: "allow",
    office: "deny",
    manager: "allow",
    field: "deny",
    partner: "deny",
  },
  vendor_payment_view: {
    admin: "allow",
    office: "allow",
    manager: "conditional",
    field: "deny",
    partner: "deny",
  },
  vendor_payment_paid: {
    admin: "allow",
    office: "allow",
    manager: "deny",
    field: "deny",
    partner: "deny",
  },
  attendance_register: {
    admin: "allow",
    office: "allow",
    manager: "allow",
    field: "allow",
    partner: "deny",
  },
  attendance_view_all: {
    admin: "allow",
    office: "deny",
    manager: "allow",
    field: "deny",
    partner: "deny",
  },
};

export const FALLBACK_PERMISSIONS = Object.entries(DEFAULT_PERMISSION_MATRIX).map(
  ([code], i) => ({
    id: code,
    code,
    name: code,
    sortOrder: i + 1,
  })
);

/** API 未取得時のフォールバック（ロール別デフォルト矩阵） */
export function buildDefaultAccessMap(
  role: UserRole
): Record<string, AccessLevel> {
  const access: Record<string, AccessLevel> = {};
  for (const [code, levels] of Object.entries(DEFAULT_PERMISSION_MATRIX)) {
    access[code] = levels[role] ?? "deny";
  }
  return access;
}
