import { google } from "googleapis";
import type { calendar_v3, drive_v3 } from "googleapis";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

export function isDriveConfigured(): boolean {
  return Boolean(parseServiceAccountJson());
}

export function isCalendarConfigured(): boolean {
  return Boolean(parseServiceAccountJson() && getCalendarId());
}

export function parseServiceAccountJson(): Record<string, unknown> | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;

  const candidates: string[] = [raw];
  if (raw.startsWith("'") && raw.endsWith("'")) {
    candidates.push(raw.slice(1, -1).trim());
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      if (parsed.client_email && parsed.private_key) return parsed;
    } catch {
      // 次候補へ
    }
  }

  console.error("[google] GOOGLE_SERVICE_ACCOUNT_JSON のパースに失敗しました");
  return null;
}

export function getServiceAccountEmail(): string | null {
  const creds = parseServiceAccountJson();
  const email = creds?.client_email;
  return typeof email === "string" ? email : null;
}

export function getCalendarSetupHint(): string {
  const calendarId = getCalendarId();
  const serviceAccountEmail = getServiceAccountEmail();

  if (!calendarId && !serviceAccountEmail) {
    return "Vercel に GOOGLE_CALENDAR_ID と GOOGLE_SERVICE_ACCOUNT_JSON を設定してください。";
  }
  if (!calendarId) {
    return "GOOGLE_CALENDAR_ID が未設定です（例: kanikaniman1234@gmail.com）。";
  }
  if (!serviceAccountEmail) {
    return "GOOGLE_SERVICE_ACCOUNT_JSON の形式を確認してください（1行 JSON）。";
  }
  return `Googleカレンダー「${calendarId}」の設定と共有で、${serviceAccountEmail} を「変更を加える権限」で追加してください。`;
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
