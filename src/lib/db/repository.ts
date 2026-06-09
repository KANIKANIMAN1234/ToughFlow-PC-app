import {
  deriveAttendanceState,
  getAllowedPunchTypes,
  validatePunchTransition,
  workDateJST,
} from "@/lib/attendance/state";
import { hashPassword } from "@/lib/auth/password";
import { EMPLOYMENT_OVERTIME_CALC_SEED } from "@/lib/employment/overtime-calc-seed";
import {
  AGREEMENT_36_GLOBAL_FISCAL_YEAR,
  DEFAULT_AGREEMENT_36_FISCAL,
  DEFAULT_AGREEMENT_36_GLOBAL,
} from "@/lib/employment/agreement-36-defaults";
import {
  DEFAULT_EMPLOYMENT_WORK_RULE,
  fromTotalMinutes,
  toTotalMinutes,
} from "@/lib/employment/work-rule-defaults";
import { buildStaffName, validateStaffInput } from "@/lib/staff/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDbClient } from "@/lib/supabase/context";
import { formatDbError } from "@/lib/db/errors";
import { resolveTenantByCodeForLine } from "@/lib/line/tenant";
import {
  DEFAULT_PERMISSION_MATRIX,
  FALLBACK_PERMISSIONS,
  ROLES,
} from "@/lib/permissions/defaults";
import type {
  AccessLevel,
  BankAccount,
  CompanyInfo,
  Customer,
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
  AttendanceHistoryEntry,
  AttendancePunch,
  AttendancePunchType,
  AttendanceStatus,
  AssignableUser,
  CreateProjectInput,
  CreateCustomerInput,
  BulkCreateCustomersResult,
  CustomerOption,
  SiteSurvey,
  SiteSurveyContent,
  SiteSurveyMasters,
  SiteSurveyTool,
  SiteSurveyWorkType,
  Agreement36Fiscal,
  Agreement36FiscalInput,
  Agreement36Global,
  Agreement36GlobalInput,
  EmploymentOvertimeCalcTypeMaster,
  EmploymentWorkRule,
  EmploymentWorkRuleInput,
  PrescribedWorkDaysType,
  StaffInput,
  StaffType,
  TenantStaff,
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
  estimated_amount: number | null;
  gross_margin_rate: number | null;
  m_customer: DbCustomer | DbCustomer[];
};

function resolveProjectMargins(row: {
  sales_amount: number | null;
  estimated_amount: number | null;
  gross_margin_rate: number | null;
}): { costAmount?: number; grossProfit?: number } {
  const sales =
    row.sales_amount != null ? Number(row.sales_amount) : undefined;
  const estimated =
    row.estimated_amount != null ? Number(row.estimated_amount) : undefined;
  const rate =
    row.gross_margin_rate != null ? Number(row.gross_margin_rate) : undefined;

  if (sales == null) return {};

  if (estimated != null) {
    return { costAmount: estimated, grossProfit: sales - estimated };
  }

  if (rate != null) {
    const grossProfit = Math.round(sales * (rate / 100));
    return { costAmount: sales - grossProfit, grossProfit };
  }

  return {};
}

function unwrapJoin<T>(value: T | T[] | null): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapProject(row: DbProjectRow): Project {
  const customer = unwrapJoin(row.m_customer);
  const customerName = customer?.name ?? "";
  const address = customer?.address ?? "";
  const margins = resolveProjectMargins(row);
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
    costAmount: margins.costAmount,
    grossProfit: margins.grossProfit,
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

export async function listActiveTenantIds(): Promise<string[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("m_tenant")
    .select("id")
    .eq("status", "active");

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.id as string);
}

/** Cron 等で RLS コンテキストを張るための管理者ユーザー */
export async function getTenantAdminUser(
  tenantId: string
): Promise<User | null> {
  const supabase = createAdminClient();
  const { data: tenant, error: tenantError } = await supabase
    .from("m_tenant")
    .select("id, name")
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantError) throw new Error(tenantError.message);
  if (!tenant) return null;

  const { data: user, error: userError } = await supabase
    .from("m_user")
    .select("id, name, role, tenant_id")
    .eq("tenant_id", tenantId)
    .eq("role", "admin")
    .eq("is_active", true)
    .order("name")
    .limit(1)
    .maybeSingle();

  if (userError) throw new Error(userError.message);
  if (!user) return null;

  return {
    id: user.id as string,
    name: user.name as string,
    role: user.role as UserRole,
    tenantId: user.tenant_id as string,
    tenantName: tenant.name as string,
  };
}

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

function toSessionUser(
  dbUser: { id: string; name: string; role: string },
  tenant: { id: string; name: string }
): User {
  return {
    id: dbUser.id,
    name: dbUser.name,
    role: dbUser.role as UserRole,
    tenantId: tenant.id,
    tenantName: tenant.name,
  };
}

/** LINE Login: line_user_id で特定。未登録なら m_user を自動作成（役職は管理者が後から設定） */
export async function loginUserByLineId(
  tenantCode: string,
  lineUserId: string,
  lineDisplayName?: string,
  options?: { defaultRole?: User["role"] }
): Promise<User> {
  const supabase = createAdminClient();
  const tenant = await resolveTenantByCodeForLine(tenantCode);

  const { data: existing, error: existingError } = await supabase
    .from("m_user")
    .select("id, name, role, tenant_id, is_active, line_user_id")
    .eq("tenant_id", tenant.id)
    .eq("line_user_id", lineUserId)
    .maybeSingle();

  if (existingError) throw new Error(formatDbError(existingError.message));

  if (existing?.is_active) {
    return toSessionUser(existing, tenant);
  }

  if (existing && !existing.is_active) {
    const name = lineDisplayName?.trim() || existing.name;
    const { data: reactivated, error: reactivateError } = await supabase
      .from("m_user")
      .update({ is_active: true, name })
      .eq("id", existing.id)
      .select("id, name, role, tenant_id, is_active")
      .single();
    if (reactivateError) throw new Error(formatDbError(reactivateError.message));
    return toSessionUser(reactivated, tenant);
  }

  const name = lineDisplayName?.trim() || "ユーザー";
  const defaultRole = options?.defaultRole ?? "field";
  const { data: created, error: createError } = await supabase
    .from("m_user")
    .insert({
      tenant_id: tenant.id,
      line_user_id: lineUserId,
      name,
      role: defaultRole,
      is_active: true,
    })
    .select("id, name, role, tenant_id, is_active")
    .single();

  if (createError) {
    if (createError.message.includes("duplicate") || createError.code === "23505") {
      const { data: retry, error: retryError } = await supabase
        .from("m_user")
        .select("id, name, role, tenant_id, is_active")
        .eq("tenant_id", tenant.id)
        .eq("line_user_id", lineUserId)
        .eq("is_active", true)
        .maybeSingle();
      if (retryError) throw new Error(formatDbError(retryError.message));
      if (retry) return toSessionUser(retry, tenant);
    }
    throw new Error(formatDbError(createError.message));
  }

  return toSessionUser(created, tenant);
}

export async function listProjects(
  tenantId: string,
  options?: { userId?: string; role?: UserRole }
): Promise<Project[]> {
  const supabase = getDbClient();
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
    .select(
      "id, tenant_id, name, status, sales_amount, estimated_amount, gross_margin_rate, m_customer(name, address)"
    )
    .eq("tenant_id", tenantId)
    .neq("status", "draft")
    .order("name");

  if (assignedIds) query = query.in("id", assignedIds);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as DbProjectRow[]).map(mapProject);
}

export async function listCustomerOptions(
  tenantId: string
): Promise<CustomerOption[]> {
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from("m_customer")
    .select("id, name, address")
    .eq("tenant_id", tenantId)
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    address: (row.address as string | null) ?? undefined,
  }));
}

export async function listAssignableUsers(
  tenantId: string
): Promise<AssignableUser[]> {
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from("m_user")
    .select("id, name, role")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    role: row.role as UserRole,
  }));
}

export async function createProjectWithAssignments(
  tenantId: string,
  input: CreateProjectInput
): Promise<Project> {
  if (!input.name.trim()) throw new Error("案件名を入力してください");
  if (!input.customerId) throw new Error("顧客を選択してください");
  if (!input.assignments.length) {
    throw new Error("担当者を1名以上選択してください");
  }

  const userIds = input.assignments.map((a) => a.userId);
  if (userIds.some((id) => !id)) {
    throw new Error("担当者を選択してください");
  }
  if (new Set(userIds).size !== userIds.length) {
    throw new Error("同じ担当者が重複しています");
  }
  if (!input.assignments.some((a) => a.assignmentRole === "main")) {
    throw new Error("メイン担当者を1名以上指定してください");
  }

  const supabase = getDbClient();
  const workStartDate =
    input.workStartDate?.trim() || new Date().toISOString().slice(0, 10);

  const { data: project, error } = await supabase
    .from("m_project")
    .insert({
      tenant_id: tenantId,
      customer_id: input.customerId,
      name: input.name.trim(),
      status: "active",
      work_start_date: workStartDate,
      site_address: input.address?.trim() || null,
      client_contact_name: input.clientContactName?.trim() || null,
      client_contact_title: input.clientContactTitle?.trim() || null,
      client_contact_phone: input.clientContactPhone?.trim() || null,
      client_contact_email: input.clientContactEmail?.trim() || null,
      project_summary: input.projectSummary?.trim() || null,
    })
    .select(
      "id, tenant_id, name, status, sales_amount, estimated_amount, gross_margin_rate, m_customer(name, address)"
    )
    .single();

  if (error) throw new Error(formatDbError(error.message));

  const assignments = input.assignments.map((assignment) => ({
    tenant_id: tenantId,
    project_id: project.id as string,
    user_id: assignment.userId,
    assignment_role: assignment.assignmentRole,
  }));

  const { error: assignError } = await supabase
    .from("t_project_assignment")
    .insert(assignments);

  if (assignError) {
    await supabase.from("m_project").delete().eq("id", project.id);
    throw new Error(formatDbError(assignError.message));
  }

  return mapProject(project as DbProjectRow);
}

export async function listCustomers(tenantId: string): Promise<Customer[]> {
  // 地図マーカー（listMapMarkers）と同様、権限・tenant_id は API 層で担保し admin 取得
  const supabase = createAdminClient();

  const { data: customers, error: customerError } = await supabase
    .from("m_customer")
    .select("id, name, address, lat, lng")
    .eq("tenant_id", tenantId)
    .order("name");

  if (customerError) throw new Error(customerError.message);

  const { data: projects, error: projectError } = await supabase
    .from("m_project")
    .select("customer_id")
    .eq("tenant_id", tenantId)
    .neq("status", "draft");

  if (projectError) throw new Error(projectError.message);

  const countByCustomer = new Map<string, number>();
  for (const project of projects ?? []) {
    if (!project.customer_id) continue;
    countByCustomer.set(
      project.customer_id,
      (countByCustomer.get(project.customer_id) ?? 0) + 1
    );
  }

  return (customers ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address?.trim() ?? "",
    lat: row.lat != null ? Number(row.lat) : undefined,
    lng: row.lng != null ? Number(row.lng) : undefined,
    projectCount: countByCustomer.get(row.id) ?? 0,
    hasMapPin: row.lat != null && row.lng != null,
  }));
}

function mapCustomerRow(row: {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
}): Customer {
  return {
    id: row.id,
    name: row.name,
    address: row.address?.trim() ?? "",
    lat: row.lat != null ? Number(row.lat) : undefined,
    lng: row.lng != null ? Number(row.lng) : undefined,
    projectCount: 0,
    hasMapPin: row.lat != null && row.lng != null,
  };
}

export async function createCustomer(
  tenantId: string,
  input: CreateCustomerInput
): Promise<Customer> {
  const name = input.name.trim();
  if (!name) throw new Error("顧客名を入力してください");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("m_customer")
    .insert({
      tenant_id: tenantId,
      name,
      address: input.address?.trim() || null,
    })
    .select("id, name, address, lat, lng")
    .single();

  if (error) throw new Error(formatDbError(error.message));
  return mapCustomerRow(data as never);
}

export async function bulkCreateCustomers(
  tenantId: string,
  rows: CreateCustomerInput[]
): Promise<BulkCreateCustomersResult> {
  const supabase = createAdminClient();
  const errors: string[] = [];
  let skipped = 0;

  const { data: existing, error: existingError } = await supabase
    .from("m_customer")
    .select("name")
    .eq("tenant_id", tenantId);

  if (existingError) throw new Error(formatDbError(existingError.message));

  const existingNames = new Set(
    (existing ?? []).map((row) => (row.name as string).trim().toLowerCase())
  );
  const batchNames = new Set<string>();
  const toInsert: { tenant_id: string; name: string; address: string | null }[] =
    [];

  rows.forEach((row, index) => {
    const lineNo = index + 1;
    const name = row.name.trim();
    if (!name) {
      skipped += 1;
      errors.push(`${lineNo}行目: 顧客名が空のためスキップしました`);
      return;
    }

    const key = name.toLowerCase();
    if (existingNames.has(key) || batchNames.has(key)) {
      skipped += 1;
      errors.push(`${lineNo}行目: 「${name}」は既に登録済みのためスキップしました`);
      return;
    }

    batchNames.add(key);
    toInsert.push({
      tenant_id: tenantId,
      name,
      address: row.address?.trim() || null,
    });
  });

  if (toInsert.length === 0) {
    return { created: 0, skipped, errors, createdCustomers: [] };
  }

  const { data: inserted, error } = await supabase
    .from("m_customer")
    .insert(toInsert)
    .select("id, name");

  if (error) throw new Error(formatDbError(error.message));

  return {
    created: inserted?.length ?? 0,
    skipped,
    errors,
    createdCustomers: (inserted ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
    })),
  };
}

export async function listMapMarkers(tenantId: string) {
  const supabase = createAdminClient();

  const { data: customers, error: customerError } = await supabase
    .from("m_customer")
    .select("id, name, address, lat, lng")
    .eq("tenant_id", tenantId)
    .order("name");

  if (customerError) throw new Error(customerError.message);

  const { data: projects, error: projectError } = await supabase
    .from("m_project")
    .select("id, name, status, customer_id")
    .eq("tenant_id", tenantId)
    .neq("status", "draft");

  if (projectError) throw new Error(projectError.message);

  const projectsByCustomer = new Map<
    string,
    { id: string; name: string; status: string }[]
  >();
  for (const project of projects ?? []) {
    if (!project.customer_id) continue;
    const list = projectsByCustomer.get(project.customer_id) ?? [];
    list.push({
      id: project.id,
      name: project.name,
      status: project.status,
    });
    projectsByCustomer.set(project.customer_id, list);
  }

  return (customers ?? [])
    .filter((row) => Boolean(row.address?.trim()))
    .map((row) => ({
      id: row.id,
      customerName: row.name,
      address: row.address!.trim(),
      lat: row.lat != null ? Number(row.lat) : null,
      lng: row.lng != null ? Number(row.lng) : null,
      projects: projectsByCustomer.get(row.id) ?? [],
    }));
}

const EXPENSE_LIST_SELECT =
  "id, project_id, user_id, amount, category_id, expense_date, status, input_method, created_at, m_project(name), m_user!user_id(name), m_expense_category(name)";

export async function listExpenses(
  tenantId: string,
  filter?: { status?: Expense["status"]; userId?: string }
): Promise<Expense[]> {
  // 承認一覧は他ユーザーの経費を参照するため service role で取得（API 層で権限チェック済み）
  const supabase = createAdminClient();
  let query = supabase
    .from("t_expense")
    .select(EXPENSE_LIST_SELECT)
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
    .select(EXPENSE_LIST_SELECT)
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
  const supabase = getDbClient();
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

export async function getSiteSurveyMasters(
  tenantId: string
): Promise<SiteSurveyMasters> {
  const supabase = getDbClient();

  const [workTypes, tools] = await Promise.all([
    supabase
      .from("m_site_survey_work_type")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("m_site_survey_tool")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  if (workTypes.error) throw new Error(workTypes.error.message);
  if (tools.error) throw new Error(tools.error.message);

  return {
    workTypes: (workTypes.data ?? []).map(
      (r) => mapMasterBase(r) as SiteSurveyWorkType
    ),
    tools: (tools.data ?? []).map((r) => mapMasterBase(r) as SiteSurveyTool),
  };
}

type ChecklistPayload = SiteSurveyContent & {
  _meta?: { status?: SiteSurvey["status"]; publishedAt?: string };
};

function parseSiteSurveyRow(row: {
  id: string;
  project_id: string;
  user_id: string;
  checklist: ChecklistPayload;
  created_at: string;
  m_project: { name: string } | { name: string }[] | null;
  m_user: { name: string } | { name: string }[] | null;
}): SiteSurvey {
  const project = unwrapJoin(row.m_project);
  const user = unwrapJoin(row.m_user);
  const { _meta, ...content } = row.checklist ?? {};
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: project?.name ?? "",
    userId: row.user_id,
    userName: user?.name ?? "",
    status: _meta?.status ?? "draft",
    content: content as SiteSurveyContent,
    createdAt: row.created_at,
    publishedAt: _meta?.publishedAt,
  };
}

export async function listSiteSurveys(
  tenantId: string,
  userId?: string
): Promise<SiteSurvey[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("t_site_survey")
    .select(
      "id, project_id, user_id, checklist, created_at, m_project(name), m_user(name)"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => parseSiteSurveyRow(row as never));
}

export async function getSiteSurvey(
  tenantId: string,
  id: string
): Promise<SiteSurvey | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("t_site_survey")
    .select(
      "id, project_id, user_id, checklist, created_at, m_project(name), m_user(name)"
    )
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return parseSiteSurveyRow(data as never);
}

function mapAttendancePunch(row: {
  id: string;
  user_id: string;
  punch_type: string;
  punched_at: string;
  work_date: string;
  source: string;
  note: string | null;
}): AttendancePunch {
  return {
    id: row.id,
    userId: row.user_id,
    punchType: row.punch_type as AttendancePunchType,
    punchedAt: row.punched_at,
    workDate: row.work_date,
    source: row.source as AttendancePunch["source"],
    note: row.note ?? undefined,
  };
}

export async function listAttendancePunches(
  tenantId: string,
  userId: string,
  workDate?: string
): Promise<AttendancePunch[]> {
  const supabase = createAdminClient();
  const date = workDate ?? workDateJST();
  const { data, error } = await supabase
    .from("t_attendance_punch")
    .select("id, user_id, punch_type, punched_at, work_date, source, note")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("work_date", date)
    .order("punched_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapAttendancePunch(row as never));
}

export async function getAttendanceStatus(
  tenantId: string,
  userId: string,
  workDate?: string
): Promise<AttendanceStatus> {
  const date = workDate ?? workDateJST();
  const punches = await listAttendancePunches(tenantId, userId, date);
  const state = deriveAttendanceState(punches);
  return {
    state,
    workDate: date,
    punches,
    allowedTypes: getAllowedPunchTypes(state),
  };
}

export async function createAttendancePunch(
  tenantId: string,
  userId: string,
  punchType: AttendancePunchType,
  source: AttendancePunch["source"]
): Promise<AttendanceStatus> {
  const workDate = workDateJST();
  const existing = await listAttendancePunches(tenantId, userId, workDate);
  const validationError = validatePunchTransition(existing, punchType);
  if (validationError) throw new Error(validationError);

  const supabase = createAdminClient();
  const { error } = await supabase.from("t_attendance_punch").insert({
    tenant_id: tenantId,
    user_id: userId,
    punch_type: punchType,
    work_date: workDate,
    source,
  });

  if (error) throw new Error(error.message);
  return getAttendanceStatus(tenantId, userId, workDate);
}

export type AttendanceHistoryQuery = {
  userId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
};

export async function listAttendanceHistory(
  tenantId: string,
  query: AttendanceHistoryQuery = {}
): Promise<AttendanceHistoryEntry[]> {
  const supabase = createAdminClient();
  let dbQuery = supabase
    .from("t_attendance_punch")
    .select(
      "id, user_id, punch_type, punched_at, work_date, source, note, m_user(name)"
    )
    .eq("tenant_id", tenantId)
    .order("punched_at", { ascending: false })
    .limit(query.limit ?? 500);

  if (query.userId) dbQuery = dbQuery.eq("user_id", query.userId);
  if (query.fromDate) dbQuery = dbQuery.gte("work_date", query.fromDate);
  if (query.toDate) dbQuery = dbQuery.lte("work_date", query.toDate);

  const { data, error } = await dbQuery;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const user = unwrapJoin(
      row.m_user as { name: string } | { name: string }[] | null
    );
    return {
      ...mapAttendancePunch(row as never),
      userName: user?.name ?? "",
    };
  });
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
  filter?: {
    tab?: "today" | "future";
    date?: string;
    from?: string;
    to?: string;
  }
): Promise<DispatchRow[]> {
  const supabase = getDbClient();
  const today = filter?.date ?? new Date().toISOString().slice(0, 10);

  let query = supabase
    .from("t_dispatch")
    .select("id, dispatch_date, project_id, row_status, content")
    .eq("tenant_id", tenantId)
    .order("dispatch_date");

  if (filter?.from) query = query.gte("dispatch_date", filter.from);
  if (filter?.to) query = query.lte("dispatch_date", filter.to);
  if (!filter?.from && !filter?.to && filter?.tab === "today") {
    query = query.eq("dispatch_date", today);
  }
  if (!filter?.from && !filter?.to && filter?.tab === "future") {
    query = query.gt("dispatch_date", today);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map(mapDispatchRow);
}

export async function getDispatch(
  tenantId: string,
  id: string
): Promise<DispatchRow | null> {
  const supabase = getDbClient();
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

  const supabase = getDbClient();
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
  const supabase = getDbClient();
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
  const supabase = getDbClient();
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
  const supabase = getDbClient();
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
  const supabase = getDbClient();
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
  const supabase = getDbClient();
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

const EMPTY_BANK_ACCOUNT: BankAccount = {
  bankName: "",
  branchName: "",
  accountType: "普通",
  accountHolder: "",
  accountNumber: "",
};

function parseBankAccount(raw: unknown): BankAccount {
  if (typeof raw === "string") {
    if (!raw.trim()) return { ...EMPTY_BANK_ACCOUNT };
    return { ...EMPTY_BANK_ACCOUNT, accountHolder: raw };
  }
  if (!raw || typeof raw !== "object") return { ...EMPTY_BANK_ACCOUNT };

  const b = raw as Record<string, string>;
  return {
    bankName: b.bank_name ?? b.bankName ?? "",
    branchName: b.branch_name ?? b.branchName ?? "",
    accountType: b.account_type ?? b.accountType ?? "普通",
    accountHolder: b.account_holder ?? b.accountHolder ?? b.name ?? "",
    accountNumber: b.account_number ?? b.accountNumber ?? "",
  };
}

function serializeBankAccount(account: BankAccount) {
  return {
    bank_name: account.bankName,
    branch_name: account.branchName,
    account_type: account.accountType,
    account_holder: account.accountHolder,
    account_number: account.accountNumber,
  };
}

export async function getCompanyInfo(tenantId: string): Promise<CompanyInfo> {
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from("m_tenant")
    .select("name, company_info")
    .eq("id", tenantId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const info = (data?.company_info ?? {}) as Record<string, unknown>;
  return {
    name: data?.name ?? (info.name as string) ?? "",
    address: (info.address as string) ?? "",
    phone: (info.phone as string) ?? "",
    bankAccount: parseBankAccount(info.bank_account ?? info.bankAccount),
  };
}

export async function updateCompanyInfo(
  tenantId: string,
  patch: Partial<CompanyInfo>
): Promise<CompanyInfo> {
  const current = await getCompanyInfo(tenantId);
  const next: CompanyInfo = {
    ...current,
    ...patch,
    bankAccount: { ...current.bankAccount, ...patch.bankAccount },
  };
  const supabase = getDbClient();

  const { error } = await supabase
    .from("m_tenant")
    .update({
      name: next.name,
      company_info: {
        address: next.address,
        phone: next.phone,
        bank_account: serializeBankAccount(next.bankAccount),
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
  const supabase = getDbClient();
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
  const supabase = getDbClient();
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
  const supabase = getDbClient();

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

export type ProjectDriveInfo = {
  projectId: string;
  projectName: string;
  projectDriveFolderId: string | null;
  workStartDate: string | null;
  customerId: string | null;
  customerName: string;
  customerDriveFolderId: string | null;
};

export async function getProjectDriveInfo(
  tenantId: string,
  projectId: string
): Promise<ProjectDriveInfo | null> {
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from("m_project")
    .select(
      "id, name, drive_folder_id, work_start_date, customer_id, m_customer(id, name, drive_folder_id)"
    )
    .eq("tenant_id", tenantId)
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const customer = unwrapJoin(
    data.m_customer as
      | { id: string; name: string; drive_folder_id: string | null }
      | { id: string; name: string; drive_folder_id: string | null }[]
      | null
  );

  return {
    projectId: data.id,
    projectName: data.name,
    projectDriveFolderId: data.drive_folder_id,
    workStartDate: data.work_start_date,
    customerId: data.customer_id,
    customerName: customer?.name ?? "未分類",
    customerDriveFolderId: customer?.drive_folder_id ?? null,
  };
}

export async function updateCustomerLocation(
  tenantId: string,
  customerId: string,
  lat: number,
  lng: number
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("m_customer")
    .update({ lat, lng })
    .eq("tenant_id", tenantId)
    .eq("id", customerId);

  if (error) throw new Error(error.message);
}

export async function updateCustomerDriveFolderId(
  tenantId: string,
  customerId: string,
  driveFolderId: string
): Promise<void> {
  const supabase = getDbClient();
  const { error } = await supabase
    .from("m_customer")
    .update({ drive_folder_id: driveFolderId })
    .eq("tenant_id", tenantId)
    .eq("id", customerId);

  if (error) throw new Error(error.message);
}

export async function updateProjectDriveFolderId(
  tenantId: string,
  projectId: string,
  driveFolderId: string
): Promise<void> {
  const supabase = getDbClient();
  const { error } = await supabase
    .from("m_project")
    .update({ drive_folder_id: driveFolderId })
    .eq("tenant_id", tenantId)
    .eq("id", projectId);

  if (error) throw new Error(error.message);
}

/** ユーザーの実効権限（個人上書き > ロール矩阵 > デフォルト） */
export async function getUserAccessMap(
  tenantId: string,
  userId: string,
  role: UserRole
): Promise<Record<string, AccessLevel>> {
  const permissions = await listPermissionDefs();
  const supabase = createAdminClient();

  const [{ data: userPerms }, { data: rolePerms }] = await Promise.all([
    supabase
      .from("m_user_permission")
      .select("permission_id, access_level, m_permission(code)")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId),
    supabase
      .from("m_role_permission")
      .select("permission_id, access_level, m_permission(code)")
      .eq("tenant_id", tenantId)
      .eq("role", role),
  ]);

  const userOverrideByCode = new Map<string, AccessLevel>();
  for (const row of userPerms ?? []) {
    const perm = Array.isArray(row.m_permission)
      ? row.m_permission[0]
      : row.m_permission;
    const code = (perm as { code?: string } | null)?.code;
    if (code) userOverrideByCode.set(code, row.access_level as AccessLevel);
  }

  const roleOverrideByCode = new Map<string, AccessLevel>();
  for (const row of rolePerms ?? []) {
    const perm = Array.isArray(row.m_permission)
      ? row.m_permission[0]
      : row.m_permission;
    const code = (perm as { code?: string } | null)?.code;
    if (code) roleOverrideByCode.set(code, row.access_level as AccessLevel);
  }

  const access: Record<string, AccessLevel> = {};
  for (const perm of permissions) {
    if (userOverrideByCode.has(perm.code)) {
      access[perm.code] = userOverrideByCode.get(perm.code)!;
    } else if (roleOverrideByCode.has(perm.code)) {
      access[perm.code] = roleOverrideByCode.get(perm.code)!;
    } else {
      access[perm.code] =
        DEFAULT_PERMISSION_MATRIX[perm.code]?.[role] ?? "deny";
    }
  }

  return access;
}

export async function getEffectivePermission(
  tenantId: string,
  userId: string,
  role: UserRole,
  permissionCode: string
): Promise<AccessLevel> {
  const map = await getUserAccessMap(tenantId, userId, role);
  return map[permissionCode] ?? "deny";
}

export async function getOfficeReminders(tenantId: string) {
  const supabase = getDbClient();
  const [expensesRes, reportsRes, paymentsRes] = await Promise.all([
    supabase
      .from("t_expense")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "submitted"),
    supabase
      .from("t_daily_report")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "draft"),
    supabase
      .from("t_vendor_payment")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "confirmed"),
  ]);

  if (expensesRes.error) throw new Error(expensesRes.error.message);
  if (reportsRes.error) throw new Error(reportsRes.error.message);
  if (paymentsRes.error) throw new Error(paymentsRes.error.message);

  return {
    pendingExpenseApprovals: expensesRes.count ?? 0,
    draftDailyReports: reportsRes.count ?? 0,
    unpaidVendorPayments: paymentsRes.count ?? 0,
  };
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
  const supabase = getDbClient();
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
  const supabase = getDbClient();
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

const STAFF_USER_COLUMNS =
  "id, name, last_name, first_name, role, email, share_notify_method, line_user_id, phone, birth_date, staff_code, staff_type, hourly_wage, prescribed_work_days_type, prescribed_work_minutes, transportation_allowance, join_date, remark1, remark2, remark3, tags";

function toPrescribedWorkParts(minutes: number | null | undefined) {
  if (minutes == null || minutes <= 0) return { hours: 0, minutes: 0 };
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 };
}

function mapStaffRow(row: Record<string, unknown>): TenantStaff {
  const prescribed = toPrescribedWorkParts(
    row.prescribed_work_minutes as number | null | undefined
  );
  const lastName = (row.last_name as string | null) ?? "";
  const firstName = (row.first_name as string | null) ?? "";
  return {
    id: row.id as string,
    name: (row.name as string) ?? buildStaffName(lastName, firstName),
    lastName,
    firstName,
    role: row.role as UserRole,
    email: (row.email as string | null) ?? undefined,
    shareNotifyMethod: row.share_notify_method as ShareNotifyMethod,
    lineUserId: (row.line_user_id as string | null) ?? undefined,
    phone: (row.phone as string | null) ?? undefined,
    birthDate: (row.birth_date as string | null) ?? undefined,
    staffCode: (row.staff_code as string | null) ?? undefined,
    staffType: ((row.staff_type as string | null) ?? "unclassified") as StaffType,
    hourlyWage: (row.hourly_wage as number | null) ?? null,
    prescribedWorkDaysType:
      ((row.prescribed_work_days_type as string | null) ??
        "unset") as PrescribedWorkDaysType,
    prescribedWorkHours: prescribed.hours,
    prescribedWorkMinutes: prescribed.minutes,
    transportationAllowance:
      (row.transportation_allowance as number | null) ?? null,
    joinDate: (row.join_date as string | null) ?? undefined,
    remark1: (row.remark1 as string | null) ?? undefined,
    remark2: (row.remark2 as string | null) ?? undefined,
    remark3: (row.remark3 as string | null) ?? undefined,
    tags: (row.tags as string | null) ?? undefined,
  };
}

function buildStaffDbPayload(
  input: StaffInput,
  passwordHash?: string | null
): Record<string, unknown> {
  const prescribedTotal =
    input.prescribedWorkHours * 60 + input.prescribedWorkMinutes;
  const payload: Record<string, unknown> = {
    last_name: input.lastName.trim(),
    first_name: input.firstName.trim(),
    name: buildStaffName(input.lastName, input.firstName),
    role: input.role,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    birth_date: input.birthDate || null,
    staff_code: input.staffCode?.trim() || null,
    staff_type: input.staffType,
    hourly_wage: input.hourlyWage ?? null,
    prescribed_work_days_type:
      input.prescribedWorkDaysType === "unset"
        ? null
        : input.prescribedWorkDaysType,
    prescribed_work_minutes: prescribedTotal > 0 ? prescribedTotal : null,
    transportation_allowance: input.transportationAllowance ?? null,
    join_date: input.joinDate || null,
    remark1: input.remark1?.trim() || null,
    remark2: input.remark2?.trim() || null,
    remark3: input.remark3?.trim() || null,
    tags: input.tags?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  if (passwordHash !== undefined) {
    payload.password_hash = passwordHash;
  }
  return payload;
}

export async function listTenantUsers(tenantId: string): Promise<TenantUser[]> {
  const staff = await listTenantStaff(tenantId);
  return staff.map((user) => ({
    id: user.id,
    name: user.name,
    role: user.role,
    email: user.email,
    shareNotifyMethod: user.shareNotifyMethod,
    lineUserId: user.lineUserId,
  }));
}

export async function listTenantStaff(
  tenantId: string
): Promise<TenantStaff[]> {
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from("m_user")
    .select(STAFF_USER_COLUMNS)
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapStaffRow(row as Record<string, unknown>));
}

export async function getTenantStaff(
  tenantId: string,
  userId: string
): Promise<TenantStaff | null> {
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from("m_user")
    .select(STAFF_USER_COLUMNS)
    .eq("tenant_id", tenantId)
    .eq("id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapStaffRow(data as Record<string, unknown>);
}

export async function createTenantStaff(
  tenantId: string,
  input: StaffInput
): Promise<TenantStaff> {
  const validationError = validateStaffInput(input, { requirePassword: true });
  if (validationError) throw new Error(validationError);

  const supabase = getDbClient();
  const passwordHash = await hashPassword(input.password!.trim());
  const payload = {
    tenant_id: tenantId,
    ...buildStaffDbPayload(input, passwordHash),
    is_active: true,
  };

  const { data, error } = await supabase
    .from("m_user")
    .insert(payload)
    .select(STAFF_USER_COLUMNS)
    .single();

  if (error) {
    if (error.code === "23505" && error.message.includes("staff_code")) {
      throw new Error("このスタッフコードは既に使用されています");
    }
    throw new Error(error.message);
  }

  return mapStaffRow(data as Record<string, unknown>);
}

export async function updateTenantStaff(
  tenantId: string,
  userId: string,
  input: StaffInput,
  actingUserId: string
): Promise<TenantStaff> {
  const validationError = validateStaffInput(input);
  if (validationError) throw new Error(validationError);

  const supabase = getDbClient();
  const { data: target, error: targetError } = await supabase
    .from("m_user")
    .select("id, role")
    .eq("tenant_id", tenantId)
    .eq("id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (targetError) throw new Error(targetError.message);
  if (!target) throw new Error("スタッフが見つかりません");

  if (target.role === "admin" && input.role !== "admin") {
    const { count, error: countError } = await supabase
      .from("m_user")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("role", "admin")
      .eq("is_active", true);
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) <= 1) {
      throw new Error("最後の管理者の役職は変更できません");
    }
  }

  let passwordHash: string | null | undefined;
  if (input.password?.trim()) {
    passwordHash = await hashPassword(input.password.trim());
  }

  const { data, error } = await supabase
    .from("m_user")
    .update(buildStaffDbPayload(input, passwordHash))
    .eq("tenant_id", tenantId)
    .eq("id", userId)
    .select(STAFF_USER_COLUMNS)
    .single();

  if (error) {
    if (error.code === "23505" && error.message.includes("staff_code")) {
      throw new Error("このスタッフコードは既に使用されています");
    }
    throw new Error(error.message);
  }

  void actingUserId;
  return mapStaffRow(data as Record<string, unknown>);
}

export async function updateUserRole(
  tenantId: string,
  userId: string,
  role: UserRole,
  updatedBy?: string
): Promise<TenantUser[]> {
  const supabase = getDbClient();

  const { data: target, error: targetError } = await supabase
    .from("m_user")
    .select("id, role")
    .eq("tenant_id", tenantId)
    .eq("id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (targetError) throw new Error(targetError.message);
  if (!target) throw new Error("ユーザーが見つかりません");

  if (target.role === "admin" && role !== "admin") {
    const { count, error: countError } = await supabase
      .from("m_user")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("role", "admin")
      .eq("is_active", true);
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) <= 1) {
      throw new Error("最後の管理者の役職は変更できません");
    }
  }

  const { error } = await supabase
    .from("m_user")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("id", userId);

  if (error) throw new Error(error.message);
  void updatedBy;
  return listTenantUsers(tenantId);
}

/** ユーザーを論理削除（is_active = false） */
export async function deactivateTenantUser(
  tenantId: string,
  userId: string,
  actingUserId: string
): Promise<TenantUser[]> {
  if (userId === actingUserId) {
    throw new Error("自分自身は削除できません");
  }

  const supabase = getDbClient();

  const { data: target, error: targetError } = await supabase
    .from("m_user")
    .select("id, role")
    .eq("tenant_id", tenantId)
    .eq("id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (targetError) throw new Error(targetError.message);
  if (!target) throw new Error("ユーザーが見つかりません");

  if (target.role === "admin") {
    const { count, error: countError } = await supabase
      .from("m_user")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("role", "admin")
      .eq("is_active", true);
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) <= 1) {
      throw new Error("最後の管理者は削除できません");
    }
  }

  const { error } = await supabase
    .from("m_user")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("id", userId);

  if (error) throw new Error(error.message);
  return listTenantUsers(tenantId);
}

export async function getUserPermissionOverrides(
  tenantId: string,
  userId: string
) {
  const permissions = await listPermissionDefs();
  const { matrix: roleMatrix } = await getRolePermissionMatrix(tenantId);
  const supabase = getDbClient();

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
  const supabase = getDbClient();

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
  const supabase = getDbClient();
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
  const supabase = getDbClient();

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

function mapOvertimeCalcTypeRow(
  row: Record<string, unknown>
): EmploymentOvertimeCalcTypeMaster {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    code: row.code as string,
    name: row.name as string,
    sortOrder: row.sort_order as number,
    isActive: row.is_active as boolean,
  };
}

async function ensureEmploymentOvertimeCalcTypes(
  tenantId: string
): Promise<void> {
  const supabase = getDbClient();
  const { count, error } = await supabase
    .from("m_employment_overtime_calc_type")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  if (error) throw new Error(error.message);
  if ((count ?? 0) > 0) return;

  const rows = EMPLOYMENT_OVERTIME_CALC_SEED.map((item, index) => ({
    tenant_id: tenantId,
    code: item.code,
    name: item.name,
    sort_order: index + 1,
    is_active: true,
  }));

  const { error: insertError } = await supabase
    .from("m_employment_overtime_calc_type")
    .insert(rows);

  if (insertError) throw new Error(insertError.message);
}

export async function listEmploymentOvertimeCalcTypes(
  tenantId: string
): Promise<EmploymentOvertimeCalcTypeMaster[]> {
  await ensureEmploymentOvertimeCalcTypes(tenantId);
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from("m_employment_overtime_calc_type")
    .select("id, tenant_id, code, name, sort_order, is_active")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) =>
    mapOvertimeCalcTypeRow(row as Record<string, unknown>)
  );
}

async function assertValidOvertimeCalcType(
  tenantId: string,
  code: string
): Promise<void> {
  const types = await listEmploymentOvertimeCalcTypes(tenantId);
  if (!types.some((item) => item.code === code)) {
    throw new Error("残業計算区分が正しくありません");
  }
}

function mapEmploymentWorkRuleRow(
  row: Record<string, unknown>
): EmploymentWorkRule {
  const scheduled = fromTotalMinutes(row.scheduled_limit_minutes as number);
  const overtimeDay = fromTotalMinutes(
    row.overtime_day_threshold_minutes as number
  );
  const overtimeWeek = fromTotalMinutes(
    row.overtime_week_threshold_minutes as number
  );
  const deemed = fromTotalMinutes(row.deemed_overtime_minutes as number);
  const lateStart = fromTotalMinutes(row.late_night_start_minutes as number);
  const lateEnd = fromTotalMinutes(row.late_night_end_minutes as number);

  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    groupKey: (row.group_key as string) ?? "",
    staffType: (row.staff_type as StaffType | null) ?? null,
    scheduledCalcType: row.scheduled_calc_type as EmploymentWorkRule["scheduledCalcType"],
    scheduledLimitHours: scheduled.hours,
    scheduledLimitMinutes: scheduled.minutes,
    overtimeRatePercent: row.overtime_rate_percent as number,
    overtimeCalcType: row.overtime_calc_type as EmploymentWorkRule["overtimeCalcType"],
    overtimeDayThresholdHours: overtimeDay.hours,
    overtimeDayThresholdMinutes: overtimeDay.minutes,
    overtimeWeekThresholdHours: overtimeWeek.hours,
    overtimeWeekThresholdMinutes: overtimeWeek.minutes,
    deemedOvertimeEnabled: row.deemed_overtime_enabled as boolean,
    deemedOvertimeHours: deemed.hours,
    deemedOvertimeMinutes: deemed.minutes,
    excludeStatutoryHolidays: row.exclude_statutory_holidays as boolean,
    lateNightRatePercent: row.late_night_rate_percent as number,
    lateNightStartHour: lateStart.hours,
    lateNightStartMinute: lateStart.minutes,
    lateNightEndHour: lateEnd.hours,
    lateNightEndMinute: lateEnd.minutes,
    includeEarlyMorningInLateNight:
      row.include_early_morning_in_late_night as boolean,
    updatedAt: row.updated_at as string,
  };
}

function buildEmploymentWorkRuleDbPayload(
  input: EmploymentWorkRuleInput,
  updatedBy?: string
) {
  return {
    group_key: input.groupKey ?? "",
    staff_type: input.staffType,
    scheduled_calc_type: input.scheduledCalcType,
    scheduled_limit_minutes: toTotalMinutes(
      input.scheduledLimitHours,
      input.scheduledLimitMinutes
    ),
    overtime_rate_percent: input.overtimeRatePercent,
    overtime_calc_type: input.overtimeCalcType,
    overtime_day_threshold_minutes: toTotalMinutes(
      input.overtimeDayThresholdHours,
      input.overtimeDayThresholdMinutes
    ),
    overtime_week_threshold_minutes: toTotalMinutes(
      input.overtimeWeekThresholdHours,
      input.overtimeWeekThresholdMinutes
    ),
    deemed_overtime_enabled: input.deemedOvertimeEnabled,
    deemed_overtime_minutes: toTotalMinutes(
      input.deemedOvertimeHours,
      input.deemedOvertimeMinutes
    ),
    exclude_statutory_holidays: input.excludeStatutoryHolidays,
    late_night_rate_percent: input.lateNightRatePercent,
    late_night_start_minutes: toTotalMinutes(
      input.lateNightStartHour,
      input.lateNightStartMinute
    ),
    late_night_end_minutes: toTotalMinutes(
      input.lateNightEndHour,
      input.lateNightEndMinute
    ),
    include_early_morning_in_late_night: input.includeEarlyMorningInLateNight,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy ?? null,
  };
}

async function ensureDefaultEmploymentWorkRule(
  tenantId: string
): Promise<void> {
  const supabase = getDbClient();
  const { count, error } = await supabase
    .from("m_employment_work_rule")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  if (error) throw new Error(error.message);
  if ((count ?? 0) > 0) return;

  const { error: insertError } = await supabase
    .from("m_employment_work_rule")
    .insert({
      tenant_id: tenantId,
      ...buildEmploymentWorkRuleDbPayload(DEFAULT_EMPLOYMENT_WORK_RULE),
    });

  if (insertError) throw new Error(insertError.message);
}

export async function listEmploymentWorkRules(
  tenantId: string
): Promise<EmploymentWorkRule[]> {
  await ensureDefaultEmploymentWorkRule(tenantId);
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from("m_employment_work_rule")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("group_key")
    .order("staff_type", { ascending: true, nullsFirst: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) =>
    mapEmploymentWorkRuleRow(row as Record<string, unknown>)
  );
}

export async function getEmploymentWorkRule(
  tenantId: string,
  ruleId: string
): Promise<EmploymentWorkRule | null> {
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from("m_employment_work_rule")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", ruleId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapEmploymentWorkRuleRow(data as Record<string, unknown>);
}

export async function findEmploymentWorkRuleByScope(
  tenantId: string,
  groupKey: string,
  staffType: StaffType | null
): Promise<EmploymentWorkRule | null> {
  await ensureDefaultEmploymentWorkRule(tenantId);
  const supabase = getDbClient();
  let query = supabase
    .from("m_employment_work_rule")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("group_key", groupKey ?? "");

  if (staffType) {
    query = query.eq("staff_type", staffType);
  } else {
    query = query.is("staff_type", null);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapEmploymentWorkRuleRow(data as Record<string, unknown>);
}

export async function upsertEmploymentWorkRule(
  tenantId: string,
  input: EmploymentWorkRuleInput,
  updatedBy?: string,
  ruleId?: string
): Promise<EmploymentWorkRule> {
  await assertValidOvertimeCalcType(tenantId, input.overtimeCalcType);
  const supabase = getDbClient();
  const payload = buildEmploymentWorkRuleDbPayload(input, updatedBy);

  if (ruleId) {
    const { data, error } = await supabase
      .from("m_employment_work_rule")
      .update(payload)
      .eq("tenant_id", tenantId)
      .eq("id", ruleId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return mapEmploymentWorkRuleRow(data as Record<string, unknown>);
  }

  const existing = await findEmploymentWorkRuleByScope(
    tenantId,
    input.groupKey,
    input.staffType
  );

  if (existing) {
    const { data, error } = await supabase
      .from("m_employment_work_rule")
      .update(payload)
      .eq("tenant_id", tenantId)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return mapEmploymentWorkRuleRow(data as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from("m_employment_work_rule")
    .insert({ tenant_id: tenantId, ...payload })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapEmploymentWorkRuleRow(data as Record<string, unknown>);
}

function mapAgreement36GlobalRow(
  row: Record<string, unknown>
): Agreement36Global {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    isEnabled: row.is_enabled as boolean,
    startMonth: row.start_month as number,
    startDay: row.start_day as number,
    agreementVersion: row.agreement_version as Agreement36Global["agreementVersion"],
    updatedAt: row.updated_at as string,
  };
}

function mapAgreement36FiscalRow(
  row: Record<string, unknown>
): Agreement36Fiscal {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    fiscalYear: row.fiscal_year as number,
    specialDailyHours: row.special_daily_hours as number,
    specialMonthlyHours: row.special_monthly_hours as number,
    specialExceedCount: row.special_exceed_count as number,
    specialYearlyHours: row.special_yearly_hours as number,
    alertDailyEnabled: row.alert_daily_enabled as boolean,
    alertDailyHours: row.alert_daily_hours as number,
    alertWeeklyEnabled: row.alert_weekly_enabled as boolean,
    alertWeeklyHours: row.alert_weekly_hours as number,
    alertMonthlyEnabled: row.alert_monthly_enabled as boolean,
    alertMonthlyHours: row.alert_monthly_hours as number,
    alertAvg26Enabled: row.alert_avg_2_6_enabled as boolean,
    alertAvg26Hours: row.alert_avg_2_6_hours as number,
    alertYearlyEnabled: row.alert_yearly_enabled as boolean,
    alertYearlyHours: row.alert_yearly_hours as number,
    alertExceedCountEnabled: row.alert_exceed_count_enabled as boolean,
    alertExceedCount: row.alert_exceed_count as number,
    notifyEmployee: row.notify_employee as boolean,
    notifyAdmin: row.notify_admin as boolean,
    notifyCustom: row.notify_custom as boolean,
    notifyCustomUserId: (row.notify_custom_user_id as string | null) ?? null,
    notifyCustomEmail: (row.notify_custom_email as string | null) ?? "",
    notifyEmployeeLine: (row.notify_employee_line as boolean | undefined) ?? false,
    notifyAdminLine: (row.notify_admin_line as boolean | undefined) ?? false,
    notifyCustomLine: (row.notify_custom_line as boolean | undefined) ?? false,
    notifyCustomLineUserId:
      (row.notify_custom_line_user_id as string | null) ?? null,
    updatedAt: row.updated_at as string,
  };
}

function buildAgreement36GlobalPayload(
  input: Agreement36GlobalInput,
  updatedBy?: string
) {
  return {
    fiscal_year: AGREEMENT_36_GLOBAL_FISCAL_YEAR,
    group_key: "",
    staff_type: null,
    is_enabled: input.isEnabled,
    start_month: input.startMonth,
    start_day: input.startDay,
    agreement_version: input.agreementVersion,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy ?? null,
  };
}

function buildAgreement36FiscalPayload(
  input: Agreement36FiscalInput,
  updatedBy?: string
) {
  return {
    fiscal_year: input.fiscalYear,
    group_key: "",
    staff_type: null,
    special_daily_hours: input.specialDailyHours,
    special_monthly_hours: input.specialMonthlyHours,
    special_exceed_count: input.specialExceedCount,
    special_yearly_hours: input.specialYearlyHours,
    alert_daily_enabled: input.alertDailyEnabled,
    alert_daily_hours: input.alertDailyHours,
    alert_weekly_enabled: input.alertWeeklyEnabled,
    alert_weekly_hours: input.alertWeeklyHours,
    alert_monthly_enabled: input.alertMonthlyEnabled,
    alert_monthly_hours: input.alertMonthlyHours,
    alert_avg_2_6_enabled: input.alertAvg26Enabled,
    alert_avg_2_6_hours: input.alertAvg26Hours,
    alert_yearly_enabled: input.alertYearlyEnabled,
    alert_yearly_hours: input.alertYearlyHours,
    alert_exceed_count_enabled: input.alertExceedCountEnabled,
    alert_exceed_count: input.alertExceedCount,
    notify_employee: input.notifyEmployee,
    notify_admin: input.notifyAdmin,
    notify_custom: input.notifyCustom,
    notify_custom_user_id: input.notifyCustomUserId,
    notify_custom_email: input.notifyCustomEmail?.trim() || null,
    notify_employee_line: input.notifyEmployeeLine,
    notify_admin_line: input.notifyAdminLine,
    notify_custom_line: input.notifyCustomLine,
    notify_custom_line_user_id: input.notifyCustomLineUserId,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy ?? null,
  };
}

async function ensureDefaultAgreement36Global(
  tenantId: string
): Promise<void> {
  const supabase = getDbClient();
  const { count, error } = await supabase
    .from("m_employment_agreement_36")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("fiscal_year", AGREEMENT_36_GLOBAL_FISCAL_YEAR);

  if (error) throw new Error(error.message);
  if ((count ?? 0) > 0) return;

  const { error: insertError } = await supabase
    .from("m_employment_agreement_36")
    .insert({
      tenant_id: tenantId,
      ...buildAgreement36GlobalPayload(DEFAULT_AGREEMENT_36_GLOBAL),
      ...buildAgreement36FiscalPayload({
        ...DEFAULT_AGREEMENT_36_FISCAL,
        fiscalYear: AGREEMENT_36_GLOBAL_FISCAL_YEAR,
      }),
    });

  if (insertError) throw new Error(insertError.message);
}

async function getAgreement36Row(
  tenantId: string,
  fiscalYear: number
): Promise<Record<string, unknown> | null> {
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from("m_employment_agreement_36")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("fiscal_year", fiscalYear)
    .eq("group_key", "")
    .is("staff_type", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Record<string, unknown> | null) ?? null;
}

export async function getAgreement36Settings(
  tenantId: string,
  fiscalYear: number
): Promise<{ global: Agreement36Global; fiscal: Agreement36Fiscal }> {
  await ensureDefaultAgreement36Global(tenantId);
  const supabase = getDbClient();

  let globalRow = await getAgreement36Row(
    tenantId,
    AGREEMENT_36_GLOBAL_FISCAL_YEAR
  );
  if (!globalRow) {
    const { data, error } = await supabase
      .from("m_employment_agreement_36")
      .insert({
        tenant_id: tenantId,
        ...buildAgreement36GlobalPayload(DEFAULT_AGREEMENT_36_GLOBAL),
        ...buildAgreement36FiscalPayload({
          ...DEFAULT_AGREEMENT_36_FISCAL,
          fiscalYear: AGREEMENT_36_GLOBAL_FISCAL_YEAR,
        }),
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    globalRow = data as Record<string, unknown>;
  }

  let fiscalRow = await getAgreement36Row(tenantId, fiscalYear);
  if (!fiscalRow) {
    const { data, error } = await supabase
      .from("m_employment_agreement_36")
      .insert({
        tenant_id: tenantId,
        ...buildAgreement36GlobalPayload(DEFAULT_AGREEMENT_36_GLOBAL),
        ...buildAgreement36FiscalPayload({
          ...DEFAULT_AGREEMENT_36_FISCAL,
          fiscalYear,
        }),
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    fiscalRow = data as Record<string, unknown>;
  }

  return {
    global: mapAgreement36GlobalRow(globalRow),
    fiscal: mapAgreement36FiscalRow(fiscalRow),
  };
}

export async function upsertAgreement36Global(
  tenantId: string,
  input: Agreement36GlobalInput,
  updatedBy?: string
): Promise<Agreement36Global> {
  await ensureDefaultAgreement36Global(tenantId);
  const supabase = getDbClient();
  const existing = await getAgreement36Row(
    tenantId,
    AGREEMENT_36_GLOBAL_FISCAL_YEAR
  );
  const payload = buildAgreement36GlobalPayload(input, updatedBy);

  if (existing?.id) {
    const { data, error } = await supabase
      .from("m_employment_agreement_36")
      .update(payload)
      .eq("tenant_id", tenantId)
      .eq("id", existing.id as string)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapAgreement36GlobalRow(data as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from("m_employment_agreement_36")
    .insert({
      tenant_id: tenantId,
      ...payload,
      ...buildAgreement36FiscalPayload({
        ...DEFAULT_AGREEMENT_36_FISCAL,
        fiscalYear: AGREEMENT_36_GLOBAL_FISCAL_YEAR,
      }),
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapAgreement36GlobalRow(data as Record<string, unknown>);
}

export async function upsertAgreement36Fiscal(
  tenantId: string,
  input: Agreement36FiscalInput,
  updatedBy?: string
): Promise<Agreement36Fiscal> {
  const supabase = getDbClient();
  const existing = await getAgreement36Row(tenantId, input.fiscalYear);
  const payload = buildAgreement36FiscalPayload(input, updatedBy);

  if (existing?.id) {
    const { data, error } = await supabase
      .from("m_employment_agreement_36")
      .update(payload)
      .eq("tenant_id", tenantId)
      .eq("id", existing.id as string)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapAgreement36FiscalRow(data as Record<string, unknown>);
  }

  const global = await getAgreement36Row(
    tenantId,
    AGREEMENT_36_GLOBAL_FISCAL_YEAR
  );
  const globalInput = global
    ? mapAgreement36GlobalRow(global)
    : DEFAULT_AGREEMENT_36_GLOBAL;

  const { data, error } = await supabase
    .from("m_employment_agreement_36")
    .insert({
      tenant_id: tenantId,
      ...buildAgreement36GlobalPayload(globalInput, updatedBy),
      ...payload,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapAgreement36FiscalRow(data as Record<string, unknown>);
}

export async function copyAgreement36FromPreviousYear(
  tenantId: string,
  fiscalYear: number,
  updatedBy?: string
): Promise<Agreement36Fiscal> {
  const previous = await getAgreement36Row(tenantId, fiscalYear - 1);
  if (!previous) {
    throw new Error(`${fiscalYear - 1}年度の設定がありません`);
  }

  const prevFiscal = mapAgreement36FiscalRow(previous);
  return upsertAgreement36Fiscal(
    tenantId,
    { ...prevFiscal, fiscalYear },
    updatedBy
  );
}
