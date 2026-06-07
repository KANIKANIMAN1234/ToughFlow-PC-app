import {
  getCompanyInfo,
  getSiteSurveyMasters,
} from "@/lib/db/repository";
import { downloadDriveFile } from "@/lib/google/download";
import { driveFileIdFromRef } from "@/lib/drive/photo-url";
import { getSitePhotoEntries } from "@/lib/site-survey/photos";
import type {
  CompanyInfo,
  SiteSurvey,
  SiteSurveyMasters,
  SiteSurveyWorkType,
} from "@/lib/types";

export type SiteSurveyPdfPhoto = {
  caption: string;
  src?: string;
  label?: string;
};

export type SiteSurveyPdfContext = {
  survey: SiteSurvey;
  company: CompanyInfo;
  workTypes: SiteSurveyWorkType[];
  workTypeName: string;
  mapCarryInSrc?: string;
  siteLayoutSrc?: string;
  sitePhotos: SiteSurveyPdfPhoto[];
  formId: string;
  generatedAt: string;
};

async function resolvePhotoSrc(url: string | undefined): Promise<string | undefined> {
  if (!url) return undefined;
  const fileId = driveFileIdFromRef(url);
  if (!fileId) return undefined;
  const data = await downloadDriveFile(fileId);
  if (!data) return undefined;
  return `data:${data.mimeType};base64,${data.buffer.toString("base64")}`;
}

export function buildFormId(survey: SiteSurvey): string {
  const date = (survey.content.surveyDate ?? survey.createdAt).slice(0, 10);
  const ymd = date.replace(/-/g, "");
  const projectShort = survey.projectId.replace(/-/g, "").slice(0, 8);
  return `FRM-001-${projectShort}-${ymd}`;
}

export function buildSiteSurveyPdfFilename(survey: SiteSurvey): string {
  const date = (survey.content.surveyDate ?? survey.createdAt).slice(0, 10);
  const ymd = date.replace(/-/g, "");
  const name = survey.projectName || survey.content.customerName || "案件";
  return `${ymd}_現地調査報告書_${name}.pdf`;
}

export function formatSurveyDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export async function buildSiteSurveyPdfContext(
  tenantId: string,
  survey: SiteSurvey
): Promise<SiteSurveyPdfContext> {
  const [company, masters] = await Promise.all([
    getCompanyInfo(tenantId),
    getSiteSurveyMasters(tenantId),
  ]);

  const c = survey.content;
  const workTypeName =
    masters.workTypes.find((w) => w.id === c.workTypeId)?.name ?? "";

  const [mapCarryInSrc, siteLayoutSrc] = await Promise.all([
    resolvePhotoSrc(c.photos.mapCarryIn),
    resolvePhotoSrc(c.photos.siteLayout),
  ]);

  const entries = getSitePhotoEntries(c.photos).filter((e) => e.url);
  const sitePhotos: SiteSurveyPdfPhoto[] = [];
  for (const entry of entries) {
    const src = await resolvePhotoSrc(entry.url);
    sitePhotos.push({ caption: entry.caption, src });
  }

  return {
    survey,
    company,
    workTypes: masters.workTypes,
    workTypeName,
    mapCarryInSrc,
    siteLayoutSrc,
    sitePhotos,
    formId: buildFormId(survey),
    generatedAt: new Date().toISOString(),
  };
}

export async function loadSiteSurveyPdfContext(
  tenantId: string,
  survey: SiteSurvey
): Promise<SiteSurveyPdfContext> {
  return buildSiteSurveyPdfContext(tenantId, survey);
}
