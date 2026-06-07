import { google } from "googleapis";
import type { drive_v3 } from "googleapis";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

export function isDriveConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim());
}

function parseServiceAccountJson(): Record<string, unknown> | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    console.error("[drive] GOOGLE_SERVICE_ACCOUNT_JSON のパースに失敗しました");
    return null;
  }
}

export async function getDriveClient(): Promise<drive_v3.Drive | null> {
  const credentials = parseServiceAccountJson();
  if (!credentials) return null;

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [DRIVE_SCOPE],
  });

  return google.drive({ version: "v3", auth });
}

export function getDriveRootFolderIdFallback(): string | null {
  const id = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim();
  return id || null;
}
