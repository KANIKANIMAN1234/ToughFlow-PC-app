import { google } from "googleapis";
import type { calendar_v3, drive_v3 } from "googleapis";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

export function isDriveConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim());
}

export function isCalendarConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() &&
      process.env.GOOGLE_CALENDAR_ID?.trim()
  );
}

function parseServiceAccountJson(): Record<string, unknown> | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    console.error("[google] GOOGLE_SERVICE_ACCOUNT_JSON のパースに失敗しました");
    return null;
  }
}

async function getGoogleAuth(scopes: string[]) {
  const credentials = parseServiceAccountJson();
  if (!credentials) return null;
  return new google.auth.GoogleAuth({ credentials, scopes });
}

export async function getDriveClient(): Promise<drive_v3.Drive | null> {
  const auth = await getGoogleAuth([DRIVE_SCOPE]);
  if (!auth) return null;
  return google.drive({ version: "v3", auth });
}

export async function getCalendarClient(): Promise<calendar_v3.Calendar | null> {
  const auth = await getGoogleAuth([CALENDAR_SCOPE]);
  if (!auth) return null;
  return google.calendar({ version: "v3", auth });
}

export function getCalendarId(): string | null {
  const id = process.env.GOOGLE_CALENDAR_ID?.trim();
  return id || null;
}

export function getDriveRootFolderIdFallback(): string | null {
  const id = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim();
  return id || null;
}
