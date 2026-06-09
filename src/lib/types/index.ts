export type UserRole = "admin" | "office" | "manager" | "field" | "partner";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  tenantId: string;
  tenantName: string;
}

export interface MasterBase {
  id: string;
  tenantId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface DailyReportWorkType extends MasterBase {}
export interface DailyReportVehicle extends MasterBase {
  code: string;
  label: string;
  noteLabel?: string;
}
export interface DailyReportMaterial extends MasterBase {
  unit?: string;
  inputType: "number" | "text" | "checkbox";
}
export interface SiteSurveyWorkType extends MasterBase {}
export interface SiteSurveyTool extends MasterBase {}

export interface SiteSurveyMasters {
  workTypes: SiteSurveyWorkType[];
  tools: SiteSurveyTool[];
}
export interface ExpenseCategory extends MasterBase {}
export interface Payee extends MasterBase {
  contact?: string;
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  projectCount: number;
  hasMapPin: boolean;
}

export interface Project {
  id: string;
  name: string;
  customerName: string;
  siteAddress: string;
  deliveryCompany: string;
  deliveryAddress: string;
  billingClient: string;
  clientContact?: string;
  salesAmount?: number;
  costAmount?: number;
  grossProfit?: number;
  status: "active" | "completed";
}

export interface MachineRow {
  name: string;
  maker: string;
  model: string;
  qty: number;
  unitNo?: string;
}

export interface VehicleSelection {
  vehicleId: string;
  note?: string;
}

export interface MaterialValue {
  materialId: string;
  value: string | number | boolean;
}

export interface DailyReportCosts {
  labor?: number | null;
  toll?: number | null;
  consumables?: number | null;
  expense?: number | null;
  total?: number | null;
  vehicle?: number | null;
  gasoline?: number | null;
  externalLabor?: number | null;
  outsource?: number | null;
}

export interface DailyReportContent {
  billingClient: string;
  clientContact?: string;
  workDateStart: string;
  workDateEnd?: string | null;
  pickup: { address?: string; company?: string };
  delivery: { address: string; company: string };
  workTypeIds: string[];
  machines: MachineRow[];
  vehicles: VehicleSelection[];
  materials: MaterialValue[];
  remarks?: string;
  siteWorkTime: { from?: string; to?: string };
  tollRoads: (number | null)[];
  siteInspection: boolean;
  roadPermit: boolean;
  guidesCount?: number | null;
  costs: DailyReportCosts;
  reporterName?: string;
  photos: string[];
}

export type DailyReportStatus = "draft" | "submitted";

export interface DailyReport {
  id: string;
  projectId: string;
  projectName: string;
  userId: string;
  userName: string;
  status: DailyReportStatus;
  content: DailyReportContent;
  createdAt: string;
  submittedAt?: string;
}

export interface SiteSurveyToolCheck {
  toolId: string | null;
  name: string;
  load: boolean;
  use: boolean;
}

export interface SiteSurveyPhotoEntry {
  url: string;
  caption: string;
}

export interface SiteSurveyContent {
  customerName: string;
  hasEstimate: boolean;
  surveyDate: string;
  siteAddress: string;
  surveyorName: string;
  contactPhone?: string;
  customerContact?: string;
  workDatetime: string;
  workTypeId: string;
  machineModel: string;
  entrance: {
    heightMm?: number;
    widthMm?: number;
    eaves?: string;
    slope?: string;
    step?: string;
  };
  plannedVehicles: string[];
  unload: {
    floor?: string;
    blueSheetM?: number;
    floorProtection?: string;
  };
  facility: {
    overheadCrane?: string;
    forklift?: string;
    other?: string;
  };
  internalMove?: string;
  requiredToolsNote?: string;
  plannedWorkers?: number;
  workSteps: string[];
  precautions: string[];
  tools: SiteSurveyToolCheck[];
  photos: {
    mapCarryIn?: string;
    siteLayout?: string;
    sitePhoto?: string;
    sitePhotoEntries?: SiteSurveyPhotoEntry[];
  };
}

export type SiteSurveyStatus = "draft" | "published";

export interface SiteSurvey {
  id: string;
  projectId: string;
  projectName: string;
  userId: string;
  userName: string;
  status: SiteSurveyStatus;
  content: SiteSurveyContent;
  createdAt: string;
  publishedAt?: string;
}

export type AttendancePunchType =
  | "clock_in"
  | "break_out"
  | "break_in"
  | "clock_out";

export type AttendanceState = "idle" | "working" | "on_break" | "finished";

export interface AttendancePunch {
  id: string;
  userId: string;
  punchType: AttendancePunchType;
  punchedAt: string;
  workDate: string;
  source: "pc" | "mobile";
  note?: string;
}

export interface AttendanceStatus {
  state: AttendanceState;
  workDate: string;
  punches: AttendancePunch[];
  allowedTypes: AttendancePunchType[];
}

export interface AttendanceHistoryEntry extends AttendancePunch {
  userName: string;
}

export interface Expense {
  id: string;
  projectId: string;
  projectName: string;
  userId: string;
  userName: string;
  amount: number;
  categoryId: string;
  categoryName: string;
  expenseDate: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  inputMethod: "manual" | "ocr" | "ocr_edited";
  memo?: string;
  createdAt: string;
}

export type VendorPaymentStatus = "draft" | "confirmed" | "paid";

export interface VendorPayment {
  id: string;
  projectId: string;
  projectName: string;
  salesAmount: number;
  payeeId: string;
  payeeName: string;
  amount: number;
  dueDate?: string;
  status: VendorPaymentStatus;
  confirmedBy?: string;
  createdAt: string;
}

export type DispatchStatus = "draft" | "confirmed";
export type DispatchSource = "manual" | "site_survey";

export interface DispatchRow {
  id: string;
  dispatchDate: string;
  projectId: string;
  customerName: string;
  siteName: string;
  assignee: string;
  vehicles: string;
  workers: number;
  status: DispatchStatus;
  source: DispatchSource;
  memo?: string;
}

export type MasterType =
  | "daily_work_types"
  | "daily_vehicles"
  | "daily_materials"
  | "site_work_types"
  | "site_tools"
  | "expense_categories"
  | "payees";

export interface BankAccount {
  bankName: string;
  branchName: string;
  accountType: string;
  accountHolder: string;
  accountNumber: string;
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  bankAccount: BankAccount;
}

export type AccessLevel = "allow" | "conditional" | "deny";

export type ShareNotifyMethod = "default" | "email" | "line" | "both";

export type PartnerDefaultMethod = "email" | "line" | "both";

export interface PermissionDef {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
}

export interface FolderSettings {
  driveRootFolderId: string;
  mailProcessedFolderId: string;
  projectNamePattern: string;
  subfolderNames: string[];
}

export interface TenantUser {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  shareNotifyMethod?: ShareNotifyMethod;
  lineUserId?: string;
}

export interface PartnerShareSettings {
  defaultMethod: PartnerDefaultMethod;
  partners: TenantUser[];
}
