import type {
  DailyReportMaterial,
  DailyReportVehicle,
  DailyReportWorkType,
  ExpenseCategory,
  Payee,
  Project,
  SiteSurveyTool,
  SiteSurveyWorkType,
} from "@/lib/types";

const TENANT_ID = "tenant-totsuka";

function id(prefix: string, n: number) {
  return `${prefix}-${n}`;
}

export const DEMO_TENANT_CODE = "TOTSUKA";

export const SEED_WORK_TYPES: DailyReportWorkType[] = [
  { id: id("m1", 1), tenantId: TENANT_ID, name: "新台搬入", sortOrder: 1, isActive: true },
  { id: id("m1", 2), tenantId: TENANT_ID, name: "搬入作業", sortOrder: 2, isActive: true },
  { id: id("m1", 3), tenantId: TENANT_ID, name: "搬出作業", sortOrder: 3, isActive: true },
  { id: id("m1", 4), tenantId: TENANT_ID, name: "積込作業", sortOrder: 4, isActive: true },
  { id: id("m1", 5), tenantId: TENANT_ID, name: "荷降作業", sortOrder: 5, isActive: true },
  { id: id("m1", 6), tenantId: TENANT_ID, name: "移設作業", sortOrder: 6, isActive: true },
  { id: id("m1", 7), tenantId: TENANT_ID, name: "応援作業", sortOrder: 7, isActive: true },
  { id: id("m1", 8), tenantId: TENANT_ID, name: "スクラップ", sortOrder: 8, isActive: true },
  { id: id("m1", 9), tenantId: TENANT_ID, name: "他（ｱﾝｶｰ等）", sortOrder: 9, isActive: true },
];

export const SEED_VEHICLES: DailyReportVehicle[] = [
  { id: id("m2", 1), tenantId: TENANT_ID, code: "oc", label: "OC", name: "OC", sortOrder: 1, isActive: true, noteLabel: "80" },
  { id: id("m2", 2), tenantId: TENANT_ID, code: "self_scania", label: "セルフ（スカニア）", name: "セルフ（スカニア）", sortOrder: 2, isActive: true },
  { id: id("m2", 3), tenantId: TENANT_ID, code: "t49_1028", label: "4.9（1028）", name: "4.9（1028）", sortOrder: 3, isActive: true },
  { id: id("m2", 4), tenantId: TENANT_ID, code: "t49_1021", label: "4.9（1021）", name: "4.9（1021）", sortOrder: 4, isActive: true },
  { id: id("m2", 5), tenantId: TENANT_ID, code: "t8_1023", label: "8t（1023）", name: "8t（1023）", sortOrder: 5, isActive: true },
  { id: id("m2", 6), tenantId: TENANT_ID, code: "t8_1025", label: "8t（1025）", name: "8t（1025）", sortOrder: 6, isActive: true, noteLabel: "80" },
  { id: id("m2", 7), tenantId: TENANT_ID, code: "t3", label: "3t", name: "3t", sortOrder: 7, isActive: true },
  { id: id("m2", 8), tenantId: TENANT_ID, code: "hiace", label: "ハイエース", name: "ハイエース", sortOrder: 8, isActive: true },
  { id: id("m2", 9), tenantId: TENANT_ID, code: "hiace_president", label: "社長ハイエース", name: "社長ハイエース", sortOrder: 9, isActive: true },
  { id: id("m2", 10), tenantId: TENANT_ID, code: "succeed", label: "サクシード", name: "サクシード", sortOrder: 10, isActive: true },
  { id: id("m2", 11), tenantId: TENANT_ID, code: "nv", label: "NV", name: "NV", sortOrder: 11, isActive: true },
  { id: id("m2", 12), tenantId: TENANT_ID, code: "caravan", label: "キャラバン", name: "キャラバン", sortOrder: 12, isActive: true },
  { id: id("m2", 13), tenantId: TENANT_ID, code: "fork5t", label: "5tフォーク", name: "5tフォーク", sortOrder: 13, isActive: true },
  { id: id("m2", 14), tenantId: TENANT_ID, code: "fork25_ev", label: "2.5t（EV）", name: "2.5t（EV）", sortOrder: 14, isActive: true, noteLabel: "1日" },
  { id: id("m2", 15), tenantId: TENANT_ID, code: "fork900", label: "900kフォーク", name: "900kフォーク", sortOrder: 15, isActive: true },
];

export const SEED_MATERIALS: DailyReportMaterial[] = [
  { id: id("m3", 0), tenantId: TENANT_ID, name: "見積り有", sortOrder: 0, isActive: true, inputType: "checkbox" },
  { id: id("m3", 1), tenantId: TENANT_ID, name: "4×8", unit: "枚", sortOrder: 1, isActive: true, inputType: "number" },
  { id: id("m3", 2), tenantId: TENANT_ID, name: "5×10", unit: "枚", sortOrder: 2, isActive: true, inputType: "number" },
  { id: id("m3", 3), tenantId: TENANT_ID, name: "2m×3m", unit: "枚", sortOrder: 3, isActive: true, inputType: "number" },
  { id: id("m3", 4), tenantId: TENANT_ID, name: "ウェス", sortOrder: 4, isActive: true, inputType: "text" },
  { id: id("m3", 5), tenantId: TENANT_ID, name: "防炎", unit: "m", sortOrder: 5, isActive: true, inputType: "number" },
  { id: id("m3", 6), tenantId: TENANT_ID, name: "青シート", sortOrder: 6, isActive: true, inputType: "text" },
];

export const SEED_SITE_WORK_TYPES: SiteSurveyWorkType[] = [
  { id: id("m4", 1), tenantId: TENANT_ID, name: "搬入", sortOrder: 1, isActive: true },
  { id: id("m4", 2), tenantId: TENANT_ID, name: "搬出", sortOrder: 2, isActive: true },
  { id: id("m4", 3), tenantId: TENANT_ID, name: "移動", sortOrder: 3, isActive: true },
];

const TOOL_NAMES = [
  "鉄板 2m×3m", "鉄板 5×10", "鉄板 4×8", "2.5tフォーク", "900kgフォーク",
  "電動ローラー", "100Vコードリール", "ハンドル", "アルミ矢", "半割",
  "切ベニア", "青切ベニア", "板台車", "脚立", "防炎養生",
  "アルミようかん", "パワーウェッジ", "マジックリン", "ウエス",
];

export const SEED_SITE_TOOLS: SiteSurveyTool[] = TOOL_NAMES.map((name, i) => ({
  id: id("m5", i + 1),
  tenantId: TENANT_ID,
  name,
  sortOrder: i + 1,
  isActive: true,
}));

export const SEED_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: id("m7", 1), tenantId: TENANT_ID, name: "高速代", sortOrder: 1, isActive: true },
  { id: id("m7", 2), tenantId: TENANT_ID, name: "ガソリン代", sortOrder: 2, isActive: true },
  { id: id("m7", 3), tenantId: TENANT_ID, name: "消耗品", sortOrder: 3, isActive: true },
  { id: id("m7", 4), tenantId: TENANT_ID, name: "駐車場", sortOrder: 4, isActive: true },
  { id: id("m7", 5), tenantId: TENANT_ID, name: "その他", sortOrder: 5, isActive: true },
];

export const SEED_PAYEES: Payee[] = [
  { id: id("m8", 1), tenantId: TENANT_ID, name: "協力運送A", sortOrder: 1, isActive: true, contact: "03-0000-0001" },
  { id: id("m8", 2), tenantId: TENANT_ID, name: "クレーン協力B", sortOrder: 2, isActive: true, contact: "03-0000-0002" },
];

export const SEED_PROJECTS: Project[] = [
  {
    id: "proj-1",
    name: "キャステック第三工場 ガンドリル搬入",
    customerName: "イワイ機械",
    siteAddress: "埼玉県加須市間口1110",
    deliveryCompany: "株式会社キャステック 第三工場",
    deliveryAddress: "埼玉県加須市間口1110",
    billingClient: "イワイ機械",
    clientContact: "祝原様",
    salesAmount: 850000,
    status: "active",
  },
  {
    id: "proj-2",
    name: "吉田電工 キューピクル搬入",
    customerName: "吉田電工",
    siteAddress: "埼玉県",
    deliveryCompany: "吉田電工",
    deliveryAddress: "埼玉県",
    billingClient: "吉田電工",
    clientContact: "吉田様",
    salesAmount: 1200000,
    status: "active",
  },
];

export { TENANT_ID };
