import {
  getCompanyInfo,
  getDailyReport,
  listMaster,
} from "@/lib/db/repository";
import type {
  CompanyInfo,
  DailyReport,
  DailyReportMaterial,
  DailyReportVehicle,
  DailyReportWorkType,
} from "@/lib/types";

export type DailyReportPdfContext = {
  report: DailyReport;
  company: CompanyInfo;
  workTypes: DailyReportWorkType[];
  vehicles: DailyReportVehicle[];
  materials: DailyReportMaterial[];
  formId: string;
  generatedAt: string;
};

const CIRCLED_NUMBERS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"];

export function circledIndex(index: number): string {
  return CIRCLED_NUMBERS[index] ?? `${index + 1}`;
}

export function formatYenValue(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "";
  return new Intl.NumberFormat("ja-JP").format(value);
}

export function formatDateParts(dateStr: string) {
  const d = new Date(dateStr);
  return {
    year: String(d.getFullYear()),
    month: String(d.getMonth() + 1),
    day: String(d.getDate()),
  };
}

export function buildFormId(report: DailyReport): string {
  const date = (report.content.workDateStart ?? report.createdAt).slice(0, 10);
  const ymd = date.replace(/-/g, "");
  const projectShort = report.projectId.replace(/-/g, "").slice(0, 8);
  return `FRM-003-${projectShort}-${ymd}`;
}

export function buildPdfFilename(report: DailyReport): string {
  const date = (report.content.workDateStart ?? report.createdAt).slice(0, 10);
  const ymd = date.replace(/-/g, "");
  const reporter = report.content.reporterName ?? report.userName ?? "担当者";
  return `${ymd}_作業日報_${reporter}.pdf`;
}

export async function loadDailyReportPdfContext(
  tenantId: string,
  id: string
): Promise<DailyReportPdfContext | null> {
  const report = await getDailyReport(tenantId, id);
  if (!report) return null;

  const [company, workTypes, vehicles, materials] = await Promise.all([
    getCompanyInfo(tenantId),
    listMaster(tenantId, "daily_work_types"),
    listMaster(tenantId, "daily_vehicles"),
    listMaster(tenantId, "daily_materials"),
  ]);

  return {
    report,
    company,
    workTypes: workTypes as DailyReportWorkType[],
    vehicles: vehicles as DailyReportVehicle[],
    materials: materials as DailyReportMaterial[],
    formId: buildFormId(report),
    generatedAt: new Date().toISOString(),
  };
}

export function getSelectedVehicleLabels(ctx: DailyReportPdfContext): string[] {
  const { report, vehicles } = ctx;
  const map = new Map(vehicles.map((v) => [v.id, v]));
  return report.content.vehicles.map((sel) => {
    const v = map.get(sel.vehicleId);
    const label = v?.label ?? v?.name ?? sel.vehicleId;
    return sel.note ? `${label}（${sel.note}）` : label;
  });
}

export function getMaterialDisplay(
  ctx: DailyReportPdfContext
): { name: string; value: string }[] {
  const { report, materials } = ctx;
  const map = new Map(materials.map((m) => [m.id, m]));
  return report.content.materials
    .map((mv) => {
      const m = map.get(mv.materialId);
      if (!m) return null;
      const value =
        typeof mv.value === "boolean"
          ? mv.value
            ? "✓"
            : ""
          : String(mv.value ?? "");
      if (!value) return null;
      return { name: m.name, value };
    })
    .filter((x): x is { name: string; value: string } => x != null);
}
