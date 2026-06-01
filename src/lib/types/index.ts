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
export interface ExpenseCategory extends MasterBase {}
export interface Payee extends MasterBase {
  contact?: string;
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

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  bankInfo: string;
}
