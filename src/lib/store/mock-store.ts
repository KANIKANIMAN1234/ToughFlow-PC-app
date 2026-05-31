import type {
  CompanyInfo,
  DailyReport,
  DailyReportMaterial,
  DailyReportVehicle,
  DailyReportWorkType,
  DispatchRow,
  Expense,
  ExpenseCategory,
  MasterType,
  Payee,
  Project,
  SiteSurveyTool,
  SiteSurveyWorkType,
  User,
  VendorPayment,
} from "@/lib/types";
import {
  SEED_EXPENSE_CATEGORIES,
  SEED_MATERIALS,
  SEED_PAYEES,
  SEED_PROJECTS,
  SEED_SITE_TOOLS,
  SEED_SITE_WORK_TYPES,
  SEED_VEHICLES,
  SEED_WORK_TYPES,
  TENANT_ID,
} from "@/lib/seed/masters";

interface MockStore {
  initialized: boolean;
  users: User[];
  projects: Project[];
  expenses: Expense[];
  dailyReports: DailyReport[];
  vendorPayments: VendorPayment[];
  dispatches: DispatchRow[];
  masters: {
    dailyWorkTypes: DailyReportWorkType[];
    dailyVehicles: DailyReportVehicle[];
    dailyMaterials: DailyReportMaterial[];
    siteWorkTypes: SiteSurveyWorkType[];
    siteTools: SiteSurveyTool[];
    expenseCategories: ExpenseCategory[];
    payees: Payee[];
  };
  companyInfo: CompanyInfo;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function createDemoData(): Pick<
  MockStore,
  "expenses" | "dailyReports" | "vendorPayments" | "dispatches"
> {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  return {
    expenses: [
      {
        id: "exp-demo-1",
        projectId: "proj-1",
        projectName: SEED_PROJECTS[0].name,
        userId: "user-field-1",
        userName: "七瀬",
        amount: 6800,
        categoryId: SEED_EXPENSE_CATEGORIES[0].id,
        categoryName: "高速代",
        expenseDate: today,
        status: "submitted",
        inputMethod: "ocr",
        createdAt: new Date().toISOString(),
      },
      {
        id: "exp-demo-2",
        projectId: "proj-1",
        projectName: SEED_PROJECTS[0].name,
        userId: "user-field-1",
        userName: "七瀬",
        amount: 13333,
        categoryId: SEED_EXPENSE_CATEGORIES[1].id,
        categoryName: "ガソリン代",
        expenseDate: today,
        status: "submitted",
        inputMethod: "manual",
        createdAt: new Date().toISOString(),
      },
    ],
    dailyReports: [
      {
        id: "dr-demo-1",
        projectId: "proj-1",
        projectName: SEED_PROJECTS[0].name,
        userId: "user-field-1",
        userName: "七瀬",
        status: "submitted",
        content: {
          billingClient: "イワイ機械",
          clientContact: "祝原様",
          workDateStart: today,
          pickup: {},
          delivery: {
            address: "埼玉県加須市間口1110",
            company: "株式会社キャステック 第三工場",
          },
          workTypeId: SEED_WORK_TYPES[0].id,
          machines: [
            { name: "ガンドリル", maker: "ミロク", model: "M-6884", qty: 1 },
          ],
          vehicles: [{ vehicleId: SEED_VEHICLES[0].id, note: "80" }],
          materials: [{ materialId: SEED_MATERIALS[5].id, value: 60 }],
          remarks: "OC・8t 2.5tF 運送はミロク手配",
          siteWorkTime: {},
          tollRoads: [null, null],
          siteInspection: false,
          roadPermit: false,
          costs: { toll: 6800, gasoline: 13333 },
          reporterName: "七瀬",
          photos: [],
        },
        createdAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
      },
    ],
    vendorPayments: [
      {
        id: "vp-demo-1",
        projectId: "proj-1",
        projectName: SEED_PROJECTS[0].name,
        salesAmount: 850000,
        payeeId: SEED_PAYEES[0].id,
        payeeName: SEED_PAYEES[0].name,
        amount: 120000,
        dueDate: tomorrow,
        status: "confirmed",
        confirmedBy: "金子社長",
        createdAt: new Date().toISOString(),
      },
    ],
    dispatches: [
      {
        id: "dsp-demo-1",
        dispatchDate: today,
        projectId: "proj-1",
        customerName: "イワイ機械",
        siteName: "キャステック第三工場",
        assignee: "七瀬",
        vehicles: "OC, 8t",
        workers: 4,
        status: "confirmed",
        source: "site_survey",
      },
      {
        id: "dsp-demo-2",
        dispatchDate: tomorrow,
        projectId: "proj-2",
        customerName: "吉田電工",
        siteName: "吉田電工",
        assignee: "飯田",
        vehicles: "4.9",
        workers: 3,
        status: "draft",
        source: "site_survey",
      },
    ],
  };
}

function createDefaultStore(): MockStore {
  const demo = createDemoData();
  return {
    initialized: true,
    users: [],
    projects: clone(SEED_PROJECTS),
    ...demo,
    masters: {
      dailyWorkTypes: clone(SEED_WORK_TYPES),
      dailyVehicles: clone(SEED_VEHICLES),
      dailyMaterials: clone(SEED_MATERIALS),
      siteWorkTypes: clone(SEED_SITE_WORK_TYPES),
      siteTools: clone(SEED_SITE_TOOLS),
      expenseCategories: clone(SEED_EXPENSE_CATEGORIES),
      payees: clone(SEED_PAYEES),
    },
    companyInfo: {
      name: "株式会社戸塚重量",
      address: "埼玉県",
      phone: "048-000-0000",
      bankInfo: "○○銀行 普通 1234567",
    },
  };
}

const globalForStore = globalThis as unknown as {
  toughflowPcStore?: MockStore;
};

function getStore(): MockStore {
  if (!globalForStore.toughflowPcStore?.initialized) {
    globalForStore.toughflowPcStore = createDefaultStore();
  }
  return globalForStore.toughflowPcStore;
}

export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function upsertUser(user: User) {
  const store = getStore();
  const idx = store.users.findIndex((u) => u.id === user.id);
  if (idx >= 0) store.users[idx] = user;
  else store.users.push(user);
  return user;
}

export function listProjects() {
  return getStore().projects;
}

export function listExpenses(filter?: {
  status?: Expense["status"];
  userId?: string;
}) {
  let items = getStore().expenses;
  if (filter?.status) items = items.filter((e) => e.status === filter.status);
  if (filter?.userId) items = items.filter((e) => e.userId === filter.userId);
  return items;
}

export function updateExpenseStatus(
  id: string,
  status: Expense["status"]
): Expense | null {
  const store = getStore();
  const item = store.expenses.find((e) => e.id === id);
  if (!item) return null;
  item.status = status;
  return item;
}

export function listDailyReports(userId?: string) {
  const items = getStore().dailyReports;
  return userId ? items.filter((r) => r.userId === userId) : items;
}

export function getDailyReport(id: string) {
  return getStore().dailyReports.find((r) => r.id === id) ?? null;
}

export function listVendorPayments(filter?: {
  status?: VendorPayment["status"];
  unpaidOnly?: boolean;
}) {
  let items = getStore().vendorPayments;
  if (filter?.unpaidOnly) {
    items = items.filter((v) => v.status !== "paid");
  } else if (filter?.status) {
    items = items.filter((v) => v.status === filter.status);
  }
  return items;
}

export function updateVendorPaymentStatus(
  id: string,
  status: VendorPayment["status"]
) {
  const item = getStore().vendorPayments.find((v) => v.id === id);
  if (!item) return null;
  item.status = status;
  return item;
}

export function listDispatches(filter?: {
  tab?: "today" | "future";
  date?: string;
}) {
  const today = filter?.date ?? new Date().toISOString().slice(0, 10);
  let items = getStore().dispatches;
  if (filter?.tab === "today") {
    items = items.filter((d) => d.dispatchDate === today);
  } else if (filter?.tab === "future") {
    items = items.filter((d) => d.dispatchDate > today);
  }
  return items.sort((a, b) => a.dispatchDate.localeCompare(b.dispatchDate));
}

export function getDispatch(id: string) {
  return getStore().dispatches.find((d) => d.id === id) ?? null;
}

export function updateDispatch(id: string, patch: Partial<DispatchRow>) {
  const item = getStore().dispatches.find((d) => d.id === id);
  if (!item) return null;
  Object.assign(item, patch);
  return item;
}

const masterMap: Record<MasterType, keyof MockStore["masters"]> = {
  daily_work_types: "dailyWorkTypes",
  daily_vehicles: "dailyVehicles",
  daily_materials: "dailyMaterials",
  site_work_types: "siteWorkTypes",
  site_tools: "siteTools",
  expense_categories: "expenseCategories",
  payees: "payees",
};

export function listMaster(type: MasterType, includeInactive = false) {
  const key = masterMap[type];
  const items = getStore().masters[key] as Array<{ isActive: boolean }>;
  return includeInactive ? items : items.filter((i) => i.isActive);
}

export function addMasterItem(
  type: MasterType,
  item: Record<string, unknown>
) {
  const key = masterMap[type];
  const items = getStore().masters[key] as unknown as Array<
    Record<string, unknown>
  >;
  const newItem = {
    id: createId("m"),
    tenantId: TENANT_ID,
    sortOrder: items.length + 1,
    isActive: true,
    ...item,
  };
  items.push(newItem);
  return newItem;
}

export function updateMasterItem(
  type: MasterType,
  id: string,
  patch: Record<string, unknown>
) {
  const key = masterMap[type];
  const items = getStore().masters[key] as unknown as Array<{
    id: string;
    [k: string]: unknown;
  }>;
  const item = items.find((i) => i.id === id);
  if (!item) return null;
  Object.assign(item, patch);
  return item;
}

export function resetMasterSeed(type: MasterType) {
  const seeds: Record<MasterType, unknown[]> = {
    daily_work_types: SEED_WORK_TYPES,
    daily_vehicles: SEED_VEHICLES,
    daily_materials: SEED_MATERIALS,
    site_work_types: SEED_SITE_WORK_TYPES,
    site_tools: SEED_SITE_TOOLS,
    expense_categories: SEED_EXPENSE_CATEGORIES,
    payees: SEED_PAYEES,
  };
  const key = masterMap[type];
  getStore().masters[key] = clone(seeds[type]) as never;
  return listMaster(type, true);
}

export function getCompanyInfo() {
  return getStore().companyInfo;
}

export function updateCompanyInfo(patch: Partial<CompanyInfo>) {
  Object.assign(getStore().companyInfo, patch);
  return getStore().companyInfo;
}

export function getMastersForField() {
  const store = getStore();
  return {
    dailyReport: {
      workTypes: store.masters.dailyWorkTypes.filter((w) => w.isActive),
      vehicles: store.masters.dailyVehicles.filter((v) => v.isActive),
      materials: store.masters.dailyMaterials.filter((m) => m.isActive),
    },
    siteSurvey: {
      workTypes: store.masters.siteWorkTypes.filter((w) => w.isActive),
      tools: store.masters.siteTools.filter((t) => t.isActive),
    },
    expenseCategories: store.masters.expenseCategories.filter((c) => c.isActive),
    projects: store.projects.filter((p) => p.status === "active"),
  };
}
