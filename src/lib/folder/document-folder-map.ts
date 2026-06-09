export type DriveDocumentType =
  | "expense"
  | "daily_report"
  | "site_survey_photo"
  | "site_survey_report"
  | "estimate"
  | "work_completion"
  | "invoice";

export type DriveFolderMappings = Record<DriveDocumentType, string>;

export const DRIVE_DOCUMENT_TYPES: DriveDocumentType[] = [
  "expense",
  "daily_report",
  "site_survey_photo",
  "site_survey_report",
  "estimate",
  "work_completion",
  "invoice",
];

export const DRIVE_DOCUMENT_TYPE_LABELS: Record<DriveDocumentType, string> = {
  expense: "立替・経費（領収書）",
  daily_report: "作業日報（PDF）",
  site_survey_photo: "現地調査（写真）",
  site_survey_report: "現地調査報告書（PDF）",
  estimate: "見積",
  work_completion: "作業完了報告",
  invoice: "請求",
};

export const DEFAULT_DRIVE_FOLDER_MAPPINGS: DriveFolderMappings = {
  expense: "経費",
  daily_report: "日報",
  site_survey_photo: "現地調査",
  site_survey_report: "報告書",
  estimate: "見積",
  work_completion: "作業完了報告",
  invoice: "請求",
};

export function mergeDocumentFolderMap(
  partial: Partial<DriveFolderMappings> | null | undefined
): DriveFolderMappings {
  return { ...DEFAULT_DRIVE_FOLDER_MAPPINGS, ...partial };
}

export function parseDocumentFolderMap(raw: unknown): DriveFolderMappings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_DRIVE_FOLDER_MAPPINGS };
  }
  const input = raw as Partial<Record<DriveDocumentType, unknown>>;
  const merged = { ...DEFAULT_DRIVE_FOLDER_MAPPINGS };
  for (const key of DRIVE_DOCUMENT_TYPES) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) {
      merged[key] = value.trim();
    }
  }
  return merged;
}

export function resolveDocumentFolderName(
  documentFolderMap: DriveFolderMappings,
  type: DriveDocumentType
): string {
  return documentFolderMap[type] || DEFAULT_DRIVE_FOLDER_MAPPINGS[type];
}

export function syncMappingsToSubfolders(
  subfolderNames: string[],
  map: DriveFolderMappings
): DriveFolderMappings {
  const fallback = subfolderNames[0] ?? DEFAULT_DRIVE_FOLDER_MAPPINGS.expense;
  const next = { ...map };
  for (const key of DRIVE_DOCUMENT_TYPES) {
    if (!subfolderNames.includes(next[key])) {
      const defaultName = DEFAULT_DRIVE_FOLDER_MAPPINGS[key];
      next[key] = subfolderNames.includes(defaultName) ? defaultName : fallback;
    }
  }
  return next;
}

export function normalizeFolderSubfolderNames(
  subfolderNames: string[],
  documentFolderMap: DriveFolderMappings
): string[] {
  const names = new Set(
    subfolderNames.map((name) => name.trim()).filter(Boolean)
  );
  for (const name of Object.values(documentFolderMap)) {
    if (name.trim()) names.add(name.trim());
  }
  return [...names];
}
