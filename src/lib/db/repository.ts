import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_PERMISSION_MATRIX,
  FALLBACK_PERMISSIONS,
  ROLES,
} from "@/lib/permissions/defaults";
import type {
  AccessLevel,
  CompanyInfo,
  DailyReport,
  DailyReportContent,
  DispatchRow,
  DispatchSource,
  DispatchStatus,
  Expense,
  FolderSettings,
  MasterType,
  PartnerDefaultMethod,
  PartnerShareSettings,
  PermissionDef,
  Project,
  ShareNotifyMethod,
  TenantUser,
  User,
  UserRole,
  VendorPayment,
  VendorPaymentStatus,
} from "@/lib/types";

type DbCustomer = { name: string; address: string | null } | null;
type DbProjectRow = {
  id: string;
  tenant_id: string;
  name: string;
  status: string;
  sales_amount: number | null;
  m_customer: DbCustomer | DbCustomer[];
};

function unwrapJoin<T>(value: T | T[] | null): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapProject(row: DbProjectRow): Project {
  const customer = unwrapJoin(row.m_customer);
  const customerName = customer?.name ?? "";
  const address = customer?.address ?? "";
  return {
    id: row.id,
    name: row.name,
    customerName,
    siteAddress: address,
    deliveryAddress: address,
    deliveryCompany: customerName,
    billingClient: customerName,
    clientContact: "",
    salesAmount: row.sales_amount ? Number(row.sales_amount) : undefined,
    status: row.status === "closed" ? "completed" : "active",
  };
}

function mapMasterBase(row: {
  id: string;
  tenant_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

const MASTER_TABLE: Record<MasterType, string> = {
  daily_work_types: "m_daily_report_work_type",
  daily_vehicles: "m_daily_report_vehicle",
  daily_materials: "m_daily_report_material",
  site_work_types: "m_site_survey_work_type",
  site_tools: "m_site_survey_tool",
  expense_categories: "m_expense_category",
  payees: "m_payee",
};

export async function loginUser(
  tenantCode: string,
  userName: string,
  role?: UserRole
): Promise<User> {
  const supabase = createAdminClient();
  const code = tenantCode.trim().toUpperCase();

  const { data: tenant, error: tenantError } = await supabase
    .from("m_tenant")
    .select("id, name, status")
    .eq("tenant_code", code)
    .maybeSingle();

  if (tenantError) throw new Error(tenantError.message);
  if (!tenant) throw new Error("会社コードが正しくありません");
  if (tenant.status !== "active") throw new Error("このテナントは利用できません");

  let query = supabase
    .from("m_user")
    .select("id, name, role, tenant_id, is_active")
    .eq("tenant_id", tenant.id)
    .eq("name", userName.trim())
    .eq("is_active", true);

  if (role) query = query.eq("role", role);

  const { data: dbUser, error: userError } = await query.maybeSingle();
  if (userError) throw new Error(userError.message);
  if (!dbUser) throw new Error("ユーザーが見つかりません");

  return {
    id: dbUser.id,
    name: dbUser.name,
    role: dbUser.role as UserRole,
    tenantId: tenant.id,
    tenantName: tenant.name,
  };
}

export async function listProjects(
  tenantId: string,
  options?: { userId?: string; role?: UserRole }
): Promise<Project[]> {
  const supabase = createAdminClient();
  let assignedIds: string[] | null = null;

  if (options?.role === "field" && options.userId) {
    const { data: assignments, error: assignError } = await supabase
      .from("t_project_assignment")
      .select("project_id")
      .eq("tenant_id", tenantId)
      .eq("user_id", options.userId);
    if (assignError) throw new Error(assignError.message);
    assignedIds = (assignments ?? []).map((r) => r.project_id as string);
    if (assignedIds.length === 0) return [];
  }

  let query = supabase
    .from("m_project")
    .select("id, tenant_id, name, status, sales_amount, m_customer(name, address)")
    .eq("tenant_id", tenantId)
    .neq("status", "draft")
    .order("name");

  if (assignedIds) query = query.in("id", assignedIds);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as DbProjectRow[]).map(mapProject);
}

export async function listExpenses(
  tenantId: string,
  filter?: { status?: Expense["status"]; userId?: string }
): Promise<Expense[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("t_expense")
    .select(
      "id, project_id, user_id, amount, category_id, expense_date, status, input_method, created_at, m_project(name), m_user(name), m_expense_category(name)"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (filter?.status) query = query.eq("status", filter.status);
  if (filter?.userId) query = query.eq("user_id", filter.userId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const project = unwrapJoin(
      row.m_project as { name: string } | { name: string }[] | null
    );
    const user = unwrapJoin(
      row.m_user as { name: string } | { name: string }[] | null
    );
    const category = unwrapJoin(
      row.m_expense_category as { name: string } | { name: string }[] | null
    );
    return {
      id: row.id,
      projectId: row.project_id,
      projectName: project?.name ?? "",
      userId: row.user_id,
      userName: user?.name ?? "",
      amount: Number(row.amount),
      categoryId: row.category_id,
      categoryName: category?.name ?? "",
      expenseDate: row.expense_date,
      status: row.status as Expense["status"],
      inputMethod: row.input_method as Expense["inputMethod"],
      createdAt: row.created_at,
    };
  });
}

export async function updateExpenseStatus(
  tenantId: string,
  id: string,
  status: Expense["status"],
  approvedBy?: string
): Promise<Expense | null> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = { status };
  if (status === "approved") {
    patch.approved_at = new Date().toISOString();
    if (approvedBy) patch.approved_by = approvedBy;
  }

  const { data, error } = await supabase
    .from("t_expense")
    .update(patch)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select(
      "id, project_id, user_id, amount, category_id, expense_date, status, input_method, created_at, m_project(name), m_user(name), m_expense_category(name)"
    )
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const project = unwrapJoin(
    data.m_project as { name: string } | { name: string }[] | null
  );
  const user = unwrapJoin(
    data.m_user as { name: string } | { name: string }[] | null
  );
  const category = unwrapJoin(
    data.m_expense_category as { name: string } | { name: string }[] | null
  );

  return {
    id: data.id,
    projectId: data.project_id,
    projectName: project?.name ?? "",
    userId: data.user_id,
    userName: user?.name ?? "",
    amount: Number(data.amount),
    categoryId: data.category_id,
    categoryName: category?.name ?? "",
    expenseDate: data.expense_date,
    status: data.status as Expense["status"],
    inputMethod: data.input_method as Expense["inputMethod"],
    createdAt: data.created_at,
  };
}

export async function listDailyReports(
  tenantId: string,
  userId?: string
): Promise<DailyReport[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("t_daily_report")
    .select(
      "id, project_id, user_id, content, status, created_at, submitted_at, m_project(name), m_user(name)"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const project = unwrapJoin(
      row.m_project as { name: string } | { name: string }[] | null
    );
    const user = unwrapJoin(
      row.m_user as { name: string } | { name: string }[] | null
    );
    return {
      id: row.id,
      projectId: row.project_id,
      projectName: project?.name ?? "",
      userId: row.user_id,
      userName: user?.name ?? "",
      status: row.status as DailyReport["status"],
      content: row.content as DailyReportContent,
      createdAt: row.created_at,
      submittedAt: row.submitted_at ?? undefined,
    };
  });
}

export async function getDailyReport(
  tenantId: string,
  id: string
): Promise<DailyReport | null> {
  const reports = await listDailyReports(tenantId);
  return reports.find((r) => r.id === id) ?? null;
}

function mapDispatchRow(row: {
  id: string;
  dispatch_date: string;
  project_id: string | null;
  row_status: string;
  content: Record<string, unknown>;
}): DispatchRow {
  const c = row.content ?? {};
  return {
    id: row.id,
    dispatchDate: row.dispatch_date,
    projectId: row.project_id ?? "",
    customerName: String(c.customerName ?? ""),
    siteName: String(c.siteName ?? ""),
    assignee: String(c.assignee ?? ""),
    vehicles: String(c.vehicles ?? ""),
    workers: Number(c.workers ?? 0),
    status: row.row_status as DispatchStatus,
    source: (c.source as DispatchSource) ?? "manual",
    memo: c.memo as string | undefined,
  };
}

export async function listDispatches(
  tenantId: string,
  filter?: { tab?: "today" | "future"; date?: string }
): Promise<DispatchRow[]> {
  const supabase = createAdminClient();
  const today = filter?.date ?? new Date().toISOString().slice(0, 10);

  let query = supabase
    .from("t_dispatch")
    .select("id, dispatch_date, project_id, row_status, content")
    .eq("tenant_id", tenantId)
    .order("dispatch_date");

  if (filter?.tab === "today") query = query.eq("dispatch_date", today);
  if (filter?.tab === "future") query = query.gt("dispatch_date", today);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map(mapDispatchRow);
}

export async function getDispatch(
  tenantId: string,
  id: string
): Promise<DispatchRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("t_dispatch")
    .select("id, dispatch_date, project_id, row_status, content")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapDispatchRow(data);
}

export async function updateDispatch(
  tenantId: string,
  id: string,
  patch: Partial<DispatchRow>
): Promise<DispatchRow | null> {
  const current = await getDispatch(tenantId, id);
  if (!current) return null;

  const supabase = createAdminClient();
  const content = {
    customerName: patch.customerName ?? current.customerName,
    siteName: patch.siteName ?? current.siteName,
    assignee: patch.assignee ?? current.assignee,
    vehicles: patch.vehicles ?? current.vehicles,
    workers: patch.workers ?? current.workers,
    source: patch.source ?? current.source,
    memo: patch.memo ?? current.memo,
  };

  const { data, error } = await supabase
    .from("t_dispatch")
    .update({
      row_status: patch.status ?? current.status,
      content,
      published_at:
        (patch.status ?? current.status) === "confirmed"
          ? new Date().toISOString()
          : undefined,
    })
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select("id, dispatch_date, project_id, row_status, content")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapDispatchRow(data);
}

export async function listVendorPayments(
  tenantId: string,
  filter?: { status?: VendorPaymentStatus; unpaidOnly?: boolean }
): Promise<VendorPayment[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("t_vendor_payment")
    .select(
      "id, project_id, payee_id, sales_amount, payment_amount, due_date, status, created_at, m_project(name), m_payee(name)"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (filter?.unpaidOnly) query = query.neq("status", "paid");
  else if (filter?.status) query = query.eq("status", filter.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const project = unwrapJoin(
      row.m_project as { name: string } | { name: string }[] | null
    );
    const payee = unwrapJoin(
      row.m_payee as { name: string } | { name: string }[] | null
    );
    return {
      id: row.id,
      projectId: row.project_id,
      projectName: project?.name ?? "",
      salesAmount: Number(row.sales_amount ?? 0),
      payeeId: row.payee_id,
      payeeName: payee?.name ?? "",
      amount: Number(row.payment_amount),
      dueDate: row.due_date ?? undefined,
      status: row.status as VendorPaymentStatus,
      createdAt: row.created_at,
    };
  });
}

export async function updateVendorPaymentStatus(
  tenantId: string,
  id: string,
  status: VendorPaymentStatus,
  paidBy?: string
): Promise<VendorPayment | null> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = { status };
  if (status === "paid") {
    patch.paid_at = new Date().toISOString();
    if (paidBy) patch.paid_by = paidBy;
  }

  const { data, error } = await supabase
    .from("t_vendor_payment")
    .update(patch)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select(
      "id, project_id, payee_id, sales_amount, payment_amount, due_date, status, created_at, m_project(name), m_payee(name)"
    )
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const project = unwrapJoin(
    data.m_project as { name: string } | { name: string }[] | null
  );
  const payee = unwrapJoin(
    data.m_payee as { name: string } | { name: string }[] | null
  );

  return {
    id: data.id,
    projectId: data.project_id,
    projectName: project?.name ?? "",
    salesAmount: Number(data.sales_amount ?? 0),
    payeeId: data.payee_id,
    payeeName: payee?.name ?? "",
    amount: Number(data.payment_amount),
    dueDate: data.due_date ?? undefined,
    status: data.status as VendorPaymentStatus,
    createdAt: data.created_at,
  };
}

function mapDbMasterRow(type: MasterType, row: Record<string, unknown>) {
  const base = mapMasterBase(row as never);
  if (type === "daily_vehicles") {
    return {
      ...base,
      name: String(row.label ?? row.name ?? ""),
      code: row.code,
      label: row.label,
      noteLabel: row.note_label ?? undefined,
    };
  }
  if (type === "daily_materials") {
    return {
      ...base,
      unit: row.unit ?? undefined,
      inputType: row.input_type,
    };
  }
  if (type === "payees") {
    return { ...base, contact: row.contact ?? undefined };
  }
  return base;
}

function mapMasterPatch(patch: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  if (patch.name !== undefined) out.name = patch.name;
  if (patch.sortOrder !== undefined) out.sort_order = patch.sortOrder;
  if (patch.isActive !== undefined) out.is_active = patch.isActive;
  if (patch.label !== undefined) {
    out.label = patch.label;
    out.name = patch.label;
  }
  if (patch.code !== undefined) out.code = patch.code;
  if (patch.noteLabel !== undefined) out.note_label = patch.noteLabel;
  if (patch.unit !== undefined) out.unit = patch.unit;
  if (patch.inputType !== undefined) out.input_type = patch.inputType;
  if (patch.contact !== undefined) out.contact = patch.contact;
  return out;
}

export async function listMaster(
  tenantId: string,
  type: MasterType,
  includeInactive = false
) {
  const supabase = createAdminClient();
  const table = MASTER_TABLE[type];
  let query = supabase
    .from(table)
    .select("*")
    .eq("tenant_id", tenantId)
    .order("sort_order");

  if (!includeInactive) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapDbMasterRow(type, row as Record<string, unknown>));
}

export async function addMasterItem(
  tenantId: string,
  type: MasterType,
  item: Record<string, unknown>
) {
  const supabase = createAdminClient();
  const table = MASTER_TABLE[type];
  const existing = await listMaster(tenantId, type, true);
  const sortOrder = existing.length + 1;

  const insert: Record<string, unknown> = {
    tenant_id: tenantId,
    sort_order: sortOrder,
    is_active: true,
    name: item.name ?? "新規項目",
    ...mapMasterPatch(item),
  };

  if (type === "daily_vehicles" && !insert.code) {
    insert.code = `custom_${Date.now()}`;
    insert.label = insert.label ?? insert.name;
  }
  if (type === "daily_materials" && !insert.input_type) {
    insert.input_type = "text";
  }

  const { data, error } = await supabase
    .from(table)
    .insert(insert)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapDbMasterRow(type, data as Record<string, unknown>);
}

export async function updateMasterItem(
  tenantId: string,
  type: MasterType,
  id: string,
  patch: Record<string, unknown>
) {
  const supabase = createAdminClient();
  const table = MASTER_TABLE[type];
  const { data, error } = await supabase
    .from(table)
    .update(mapMasterPatch(patch))
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapDbMasterRow(type, data as Record<string, unknown>);
}

export async function resetMasterSeed(tenantId: string, type: MasterType) {
  return listMaster(tenantId, type, true);
}

export async function getCompanyInfo(tenantId: string): Promise<CompanyInfo> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("m_tenant")
    .select("name, company_info")
    .eq("id", tenantId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const info = (data?.company_info ?? {}) as Record<string, string>;
  return {
    name: data?.name ?? info.name ?? "",
    address: info.address ?? "",
    phone: info.phone ?? "",
    bankInfo: info.bank_account ?? info.bankInfo ?? "",
  };
}

export async function updateCompanyInfo(
  tenantId: string,
  patch: Partial<CompanyInfo>
): Promise<CompanyInfo> {
  const current = await getCompanyInfo(tenantId);
  const next = { ...current, ...patch };
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("m_tenant")
    .update({
      name: next.name,
      company_info: {
        address: next.address,
        phone: next.phone,
        bank_account: next.bankInfo,
      },
    })
    .eq("id", tenantId);

  if (error) throw new Error(error.message);
  return next;
}

export type DashboardSummary = {
  expenses: number;
  dailyReports: number;
  dispatch: number;
  vendorPayments: number;
};

export async function getDashboardSummary(
  tenantId: string
): Promise<DashboardSummary> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const [expensesRes, reportsRes, dispatchRes, paymentsRes] = await Promise.all([
    supabase
      .from("t_expense")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "submitted"),
    supabase
      .from("t_daily_report")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    supabase
      .from("t_dispatch")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("dispatch_date", today),
    supabase
      .from("t_vendor_payment")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .neq("status", "paid"),
  ]);

  if (expensesRes.error) throw new Error(expensesRes.error.message);
  if (reportsRes.error) throw new Error(reportsRes.error.message);
  if (dispatchRes.error) throw new Error(dispatchRes.error.message);
  if (paymentsRes.error) throw new Error(paymentsRes.error.message);

  return {
    expenses: expensesRes.count ?? 0,
    dailyReports: reportsRes.count ?? 0,
    dispatch: dispatchRes.count ?? 0,
    vendorPayments: paymentsRes.count ?? 0,
  };
}

const DEFAULT_SUBFOLDERS = [
  "経費",
  "日報",
  "現地調査",
  "報告書",
  "見積",
  "作業完了報告",
  "請求",
];

export async function getFolderSettings(
  tenantId: string
): Promise<FolderSettings> {
  const supabase = createAdminClient();
  const [tenantRes, templateRes] = await Promise.all([
    supabase
      .from("m_tenant")
      .select("drive_root_folder_id, mail_processed_folder_id")
      .eq("id", tenantId)
      .maybeSingle(),
    supabase
      .from("m_folder_template")
      .select("subfolder_names, project_name_pattern")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
  ]);

  if (tenantRes.error) throw new Error(tenantRes.error.message);
  if (templateRes.error) throw new Error(templateRes.error.message);

  const subfolders = templateRes.data?.subfolder_names;
  return {
    driveRootFolderId: tenantRes.data?.drive_root_folder_id ?? "",
    mailProcessedFolderId: tenantRes.data?.mail_processed_folder_id ?? "",
    projectNamePattern:
      templateRes.data?.project_name_pattern ?? "{date}_{name}",
    subfolderNames: Array.isArray(subfolders)
      ? (subfolders as string[])
      : DEFAULT_SUBFOLDERS,
  };
}

export async function updateFolderSettings(
  tenantId: string,
  patch: Partial<FolderSettings>
): Promise<FolderSettings> {
  const current = await getFolderSettings(tenantId);
  const next = { ...current, ...patch };
  const supabase = createAdminClient();

  const { error: tenantError } = await supabase
    .from("m_tenant")
    .update({
      drive_root_folder_id: next.driveRootFolderId || null,
      mail_processed_folder_id: next.mailProcessedFolderId || null,
    })
    .eq("id", tenantId);

  if (tenantError) throw new Error(tenantError.message);

  const { data: existing } = await supabase
    .from("m_folder_template")
    .select("id")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const templatePayload = {
    subfolder_names: next.subfolderNames,
    project_name_pattern: next.projectNamePattern,
  };

  if (existing?.id) {
    const { error } = await supabase
      .from("m_folder_template")
      .update(templatePayload)
      .eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("m_folder_template")
      .insert({ tenant_id: tenantId, ...templatePayload });
    if (error) throw new Error(error.message);
  }

  return next;
}

export async function listPermissionDefs(): Promise<PermissionDef[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("m_permission")
    .select("id, code, name, sort_order")
    .order("sort_order");

  if (error || !data?.length) {
    return FALLBACK_PERMISSIONS.map((p, i) => ({
      ...p,
      name: p.code,
      sortOrder: i + 1,
    }));
  }

  return data.map((row) => ({
    id: row.id as string,
    code: row.code as string,
    name: row.name as string,
    sortOrder: Number(row.sort_order),
  }));
}

function resolveRoleLevel(
  permissionCode: string,
  role: UserRole,
  overrides: Map<string, AccessLevel>
): AccessLevel {
  const key = `${permissionCode}:${role}`;
  if (overrides.has(key)) return overrides.get(key)!;
  return DEFAULT_PERMISSION_MATRIX[permissionCode]?.[role] ?? "deny";
}

export async function getRolePermissionMatrix(tenantId: string) {
  const permissions = await listPermissionDefs();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("m_role_permission")
    .select("permission_id, role, access_level, m_permission(code)")
    .eq("tenant_id", tenantId);

  if (error) throw new Error(error.message);

  const overrides = new Map<string, AccessLevel>();
  for (const row of data ?? []) {
    const perm = Array.isArray(row.m_permission)
      ? row.m_permission[0]
      : row.m_permission;
    const code = (perm as { code?: string } | null)?.code;
    if (!code) continue;
    overrides.set(
      `${code}:${row.role as UserRole}`,
      row.access_level as AccessLevel
    );
  }

  const matrix: Record<string, Record<UserRole, AccessLevel>> = {};
  for (const perm of permissions) {
    matrix[perm.id] = {} as Record<UserRole, AccessLevel>;
    for (const role of ROLES) {
      matrix[perm.id][role] = resolveRoleLevel(perm.code, role, overrides);
    }
  }

  return { permissions, matrix };
}

export async function updateRolePermissionMatrix(
  tenantId: string,
  updates: { permissionId: string; role: UserRole; accessLevel: AccessLevel }[],
  updatedBy?: string
) {
  const supabase = createAdminClient();
  const permissions = await listPermissionDefs();
  const codeById = new Map(permissions.map((p) => [p.id, p.code]));

  for (const item of updates) {
    const code = codeById.get(item.permissionId) ?? item.permissionId;
    let permissionId = item.permissionId;

    if (!codeById.has(item.permissionId)) {
      const { data: permRow } = await supabase
        .from("m_permission")
        .select("id")
        .eq("code", code)
        .maybeSingle();
      if (!permRow?.id) continue;
      permissionId = permRow.id as string;
    }

    const { error } = await supabase.from("m_role_permission").upsert(
      {
        tenant_id: tenantId,
        role: item.role,
        permission_id: permissionId,
        access_level: item.accessLevel,
        updated_by: updatedBy ?? null,
      },
      { onConflict: "tenant_id,role,permission_id" }
    );
    if (error) throw new Error(error.message);
  }

  return getRolePermissionMatrix(tenantId);
}

export async function listTenantUsers(tenantId: string): Promise<TenantUser[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("m_user")
    .select("id, name, role, email, share_notify_method")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    role: row.role as UserRole,
    email: (row.email as string | null) ?? undefined,
    shareNotifyMethod: row.share_notify_method as ShareNotifyMethod,
  }));
}

export async function getUserPermissionOverrides(
  tenantId: string,
  userId: string
) {
  const permissions = await listPermissionDefs();
  const { matrix: roleMatrix } = await getRolePermissionMatrix(tenantId);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("m_user_permission")
    .select("permission_id, access_level")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  const overrides = new Map(
    (data ?? []).map((row) => [
      row.permission_id as string,
      row.access_level as AccessLevel,
    ])
  );

  const effective: Record<string, AccessLevel | null> = {};
  for (const perm of permissions) {
    effective[perm.id] = overrides.has(perm.id)
      ? overrides.get(perm.id)!
      : null;
  }

  return { permissions, roleMatrix, overrides: effective };
}

export async function updateUserPermissionOverrides(
  tenantId: string,
  userId: string,
  updates: { permissionId: string; accessLevel: AccessLevel | null }[],
  updatedBy?: string
) {
  const supabase = createAdminClient();

  for (const item of updates) {
    if (item.accessLevel === null) {
      const { error } = await supabase
        .from("m_user_permission")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .eq("permission_id", item.permissionId);
      if (error) throw new Error(error.message);
      continue;
    }

    const { error } = await supabase.from("m_user_permission").upsert(
      {
        tenant_id: tenantId,
        user_id: userId,
        permission_id: item.permissionId,
        access_level: item.accessLevel,
        updated_by: updatedBy ?? null,
      },
      { onConflict: "tenant_id,user_id,permission_id" }
    );
    if (error) throw new Error(error.message);
  }

  return getUserPermissionOverrides(tenantId, userId);
}

export async function getPartnerShareSettings(
  tenantId: string
): Promise<PartnerShareSettings> {
  const supabase = createAdminClient();
  const { data: tenant, error: tenantError } = await supabase
    .from("m_tenant")
    .select("partner_share_default_method")
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantError) throw new Error(tenantError.message);

  const users = await listTenantUsers(tenantId);
  return {
    defaultMethod:
      (tenant?.partner_share_default_method as PartnerDefaultMethod) ?? "email",
    partners: users.filter((u) => u.role === "partner"),
  };
}

export async function updatePartnerShareSettings(
  tenantId: string,
  patch: {
    defaultMethod?: PartnerDefaultMethod;
    partners?: {
      userId: string;
      shareNotifyMethod: ShareNotifyMethod;
      email?: string;
    }[];
  }
): Promise<PartnerShareSettings> {
  const supabase = createAdminClient();

  if (patch.defaultMethod) {
    const { error } = await supabase
      .from("m_tenant")
      .update({ partner_share_default_method: patch.defaultMethod })
      .eq("id", tenantId);
    if (error) throw new Error(error.message);
  }

  if (patch.partners) {
    for (const partner of patch.partners) {
      const { error } = await supabase
        .from("m_user")
        .update({
          share_notify_method: partner.shareNotifyMethod,
          email: partner.email ?? null,
        })
        .eq("tenant_id", tenantId)
        .eq("id", partner.userId);
      if (error) throw new Error(error.message);
    }
  }

  return getPartnerShareSettings(tenantId);
}
