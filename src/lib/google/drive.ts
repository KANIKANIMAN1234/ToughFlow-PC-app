import { Readable } from "stream";
import type { drive_v3 } from "googleapis";
import {
  getProjectDriveInfo,
  getFolderSettings,
  updateCustomerDriveFolderId,
  updateProjectDriveFolderId,
} from "@/lib/db/repository";
import { getDriveClient, getDriveRootFolderIdFallback, isDriveConfigured } from "./client";

const FOLDER_MIME = "application/vnd.google-apps.folder";

export function sanitizeDriveName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").trim() || "無題";
}

function escapeDriveQuery(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export function formatProjectFolderName(
  pattern: string,
  projectName: string,
  workStartDate: string | null
): string {
  const date =
    workStartDate?.replace(/-/g, "") ??
    new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return sanitizeDriveName(
    pattern.replace(/\{date\}/g, date).replace(/\{name\}/g, projectName)
  );
}

async function findChildFolder(
  drive: drive_v3.Drive,
  parentId: string,
  name: string
): Promise<string | null> {
  const q = [
    `'${parentId}' in parents`,
    `name = '${escapeDriveQuery(name)}'`,
    `mimeType = '${FOLDER_MIME}'`,
    "trashed = false",
  ].join(" and ");

  const res = await drive.files.list({
    q,
    fields: "files(id)",
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return res.data.files?.[0]?.id ?? null;
}

async function createFolder(
  drive: drive_v3.Drive,
  parentId: string,
  name: string
): Promise<string> {
  const res = await drive.files.create({
    requestBody: {
      name: sanitizeDriveName(name),
      mimeType: FOLDER_MIME,
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  const id = res.data.id;
  if (!id) throw new Error(`Drive フォルダ作成に失敗: ${name}`);
  return id;
}

export async function findOrCreateFolder(
  drive: drive_v3.Drive,
  parentId: string,
  name: string
): Promise<string> {
  const safeName = sanitizeDriveName(name);
  const existing = await findChildFolder(drive, parentId, safeName);
  if (existing) return existing;
  return createFolder(drive, parentId, safeName);
}

export type ProjectFolderMap = {
  projectFolderId: string;
  subfolders: Record<string, string>;
};

export async function ensureProjectDriveFolders(
  tenantId: string,
  projectId: string
): Promise<ProjectFolderMap | null> {
  if (!isDriveConfigured()) return null;

  const drive = await getDriveClient();
  if (!drive) return null;

  const [project, settings] = await Promise.all([
    getProjectDriveInfo(tenantId, projectId),
    getFolderSettings(tenantId),
  ]);

  if (!project) return null;

  const rootId =
    settings.driveRootFolderId || getDriveRootFolderIdFallback() || null;
  if (!rootId) {
    console.warn("[drive] ルートフォルダ ID が未設定です");
    return null;
  }

  let customerFolderId = project.customerDriveFolderId;
  if (project.customerId && !customerFolderId) {
    customerFolderId = await findOrCreateFolder(
      drive,
      rootId,
      project.customerName
    );
    await updateCustomerDriveFolderId(
      tenantId,
      project.customerId,
      customerFolderId
    );
  }

  const parentForProject = customerFolderId ?? rootId;
  let projectFolderId = project.projectDriveFolderId;
  if (!projectFolderId) {
    const folderName = formatProjectFolderName(
      settings.projectNamePattern,
      project.projectName,
      project.workStartDate
    );
    projectFolderId = await findOrCreateFolder(
      drive,
      parentForProject,
      folderName
    );
    await updateProjectDriveFolderId(tenantId, projectId, projectFolderId);
  }

  const subfolders: Record<string, string> = {};
  for (const name of settings.subfolderNames) {
    subfolders[name] = await findOrCreateFolder(
      drive,
      projectFolderId,
      name
    );
  }

  return { projectFolderId, subfolders };
}

export async function uploadFileToDrive(
  parentFolderId: string,
  fileName: string,
  mimeType: string,
  data: Buffer
): Promise<string | null> {
  if (!isDriveConfigured()) return null;

  const drive = await getDriveClient();
  if (!drive) return null;

  const res = await drive.files.create({
    requestBody: {
      name: sanitizeDriveName(fileName),
      parents: [parentFolderId],
    },
    media: {
      mimeType,
      body: Readable.from(data),
    },
    fields: "id",
    supportsAllDrives: true,
  });

  return res.data.id ?? null;
}
