import { Readable } from "stream";
import type { drive_v3 } from "googleapis";
import {
  getProjectDriveInfo,
  getFolderSettings,
  updateCustomerDriveFolderId,
  updateProjectDriveFolderId,
} from "@/lib/db/repository";
import { collectDriveSubfolderNames } from "@/lib/folder/document-folder-map";
import { getDriveClient, getDriveRootFolderIdFallback, isDriveConfigured } from "./client";

const FOLDER_MIME = "application/vnd.google-apps.folder";

export function sanitizeDriveName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").trim() || "無題";
}

/** サービスアカウントは共有ドライブ以外にファイルを保存できない */
export function formatDriveApiError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes("Service Accounts do not have storage quota")) {
    return (
      "Google ドライブの保存先がマイドライブになっています。" +
      "管理設定の「Drive ルートフォルダ ID」を Google 共有ドライブ（Shared Drive）内のフォルダに変更し、" +
      "サービスアカウントを共有ドライブのメンバー（コンテンツ管理者以上）に追加してください。"
    );
  }
  if (msg.includes("File not found") || msg.includes("notFound")) {
    return "指定された Google ドライブフォルダが見つかりません。ルートフォルダ ID を確認してください。";
  }
  if (msg.includes("Insufficient permissions") || msg.includes("403")) {
    return "Google ドライブへのアクセス権がありません。サービスアカウントを共有ドライブのメンバーに追加してください。";
  }
  return msg;
}

type FolderDriveInfo = {
  id: string;
  name: string;
  driveId: string | null;
};

async function getFolderDriveInfo(
  drive: drive_v3.Drive,
  folderId: string
): Promise<FolderDriveInfo> {
  const res = await drive.files.get({
    fileId: folderId,
    fields: "id, name, driveId",
    supportsAllDrives: true,
  });

  return {
    id: res.data.id ?? folderId,
    name: res.data.name ?? folderId,
    driveId: res.data.driveId ?? null,
  };
}

async function assertSharedDriveFolder(
  drive: drive_v3.Drive,
  folderId: string,
  label = "保存先フォルダ"
): Promise<string> {
  const info = await getFolderDriveInfo(drive, folderId);

  if (!info.driveId) {
    throw new Error(
      `${label}「${info.name}」は Google 共有ドライブ（Shared Drive）内にありません。` +
        "管理設定の Drive ルートフォルダ ID を共有ドライブ内のフォルダに変更してください。"
    );
  }

  return info.driveId;
}

async function isFolderInSharedDrive(
  drive: drive_v3.Drive,
  folderId: string | null | undefined,
  expectedDriveId: string
): Promise<boolean> {
  if (!folderId) return false;
  try {
    const info = await getFolderDriveInfo(drive, folderId);
    return info.driveId === expectedDriveId;
  } catch {
    return false;
  }
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
  try {
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
  } catch (e) {
    throw new Error(formatDriveApiError(e));
  }
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

  const rootDriveId = await assertSharedDriveFolder(
    drive,
    rootId,
    "Drive ルートフォルダ"
  );

  let customerFolderId = project.customerDriveFolderId;
  if (!(await isFolderInSharedDrive(drive, customerFolderId, rootDriveId))) {
    if (customerFolderId) {
      console.warn(
        "[drive] 顧客フォルダ ID が共有ドライブ外のため再作成します:",
        customerFolderId
      );
    }
    customerFolderId = null;
  }

  if (project.customerId && !customerFolderId) {
    customerFolderId = await ensureCustomerDriveFolder(
      tenantId,
      project.customerId,
      project.customerName
    );
  }

  const parentForProject = customerFolderId ?? rootId;
  let projectFolderId = project.projectDriveFolderId;
  if (!(await isFolderInSharedDrive(drive, projectFolderId, rootDriveId))) {
    if (projectFolderId) {
      console.warn(
        "[drive] 案件フォルダ ID が共有ドライブ外のため再作成します:",
        projectFolderId
      );
    }
    projectFolderId = null;
  }

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
  const folderNames = collectDriveSubfolderNames(
    settings.subfolderNames,
    settings.documentFolderMap
  );
  for (const name of folderNames) {
    subfolders[name] = await findOrCreateFolder(
      drive,
      projectFolderId,
      name
    );
  }

  return { projectFolderId, subfolders };
}

/** ルート配下に顧客名フォルダを作成し m_customer.drive_folder_id を更新 */
export async function ensureCustomerDriveFolder(
  tenantId: string,
  customerId: string,
  customerName: string
): Promise<string | null> {
  if (!isDriveConfigured()) return null;

  const drive = await getDriveClient();
  if (!drive) return null;

  const settings = await getFolderSettings(tenantId);
  const rootId =
    settings.driveRootFolderId || getDriveRootFolderIdFallback() || null;
  if (!rootId) {
    console.warn("[drive] ルートフォルダ ID が未設定です");
    return null;
  }

  await assertSharedDriveFolder(drive, rootId, "Drive ルートフォルダ");

  const customerFolderId = await findOrCreateFolder(
    drive,
    rootId,
    customerName
  );
  await updateCustomerDriveFolderId(tenantId, customerId, customerFolderId);
  return customerFolderId;
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

  try {
    await assertSharedDriveFolder(drive, parentFolderId, "アップロード先フォルダ");

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
  } catch (e) {
    throw new Error(formatDriveApiError(e));
  }
}
