import { SignJWT } from "jose";

import {
  getCalendarId,
  getCalendarSetupHint,
  getServiceAccountEmail,
  isCalendarConfigured,
  isDriveConfigured,
  parseServiceAccountJson,
} from "@/lib/google/client";

export type ConfigCheck = {
  configured: boolean;
  ok: boolean;
  hint?: string;
  detail?: string;
};

export type ConfigStatus = {
  ok: boolean;
  app: "pc";
  checks: {
    supabase: ConfigCheck;
    jwt: ConfigCheck;
    line: ConfigCheck;
    openai: ConfigCheck;
    googleDrive: ConfigCheck;
    googleCalendar: ConfigCheck;
    googleMaps: ConfigCheck;
  };
};

async function testJwtSign(): Promise<ConfigCheck> {
  const secret = process.env.SUPABASE_JWT_SECRET?.trim();
  if (!secret) {
    return {
      configured: false,
      ok: false,
      hint: "Supabase ダッシュボード → Settings → API → JWT Secret を Vercel に SUPABASE_JWT_SECRET として設定",
    };
  }

  try {
    await new SignJWT({ role: "authenticated", tenant_id: "health-check" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("5m")
      .sign(new TextEncoder().encode(secret));
    return { configured: true, ok: true };
  } catch (e) {
    return {
      configured: true,
      ok: false,
      hint: "JWT Secret の値が正しくありません",
      detail: e instanceof Error ? e.message : "署名失敗",
    };
  }
}

export async function getConfigStatus(): Promise<ConfigStatus> {
  const supabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
  const supabaseAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());
  const supabaseService = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  const supabaseOk = supabaseUrl && supabaseAnon && supabaseService;

  const jwt = await testJwtSign();

  const lineChannelId = Boolean(process.env.LINE_CHANNEL_ID?.trim());
  const lineSecret = Boolean(process.env.LINE_CHANNEL_SECRET?.trim());
  const lineCallback = Boolean(process.env.LINE_CALLBACK_URL?.trim());
  const lineOk = lineChannelId && lineSecret && lineCallback;

  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());

  const driveJsonOk = Boolean(parseServiceAccountJson());
  const driveRoot = Boolean(process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim());
  const driveConfigured = isDriveConfigured();

  const calendarConfigured = isCalendarConfigured();
  const calendar: ConfigCheck = {
    configured: calendarConfigured,
    ok: calendarConfigured,
    hint: calendarConfigured ? undefined : getCalendarSetupHint(),
    detail: calendarConfigured
      ? `${getCalendarId()} ← ${getServiceAccountEmail()}`
      : undefined,
  };

  const mapsKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim());
  const mapsId = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim());
  const mapsOk = mapsKey && mapsId;

  const checks = {
    supabase: {
      configured: supabaseUrl && supabaseAnon,
      ok: supabaseOk,
      hint: supabaseOk
        ? undefined
        : "NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY を設定",
    },
    jwt,
    line: {
      configured: lineChannelId && lineSecret,
      ok: lineOk,
      hint: lineOk
        ? undefined
        : "LINE_CHANNEL_ID / LINE_CHANNEL_SECRET / LINE_CALLBACK_URL を設定",
    },
    openai: {
      configured: openaiConfigured,
      ok: true,
      hint: openaiConfigured ? undefined : "任意（OCR は Mobile 側で使用）",
    },
    googleDrive: {
      configured: driveConfigured,
      ok: driveJsonOk && driveRoot,
      hint: driveJsonOk
        ? driveRoot
          ? undefined
          : "GOOGLE_DRIVE_ROOT_FOLDER_ID を設定"
        : "GOOGLE_SERVICE_ACCOUNT_JSON を1行 JSON で設定",
    },
    googleCalendar: calendar,
    googleMaps: {
      configured: mapsKey,
      ok: mapsOk,
      hint: mapsOk
        ? undefined
        : "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY / MAP_ID を設定し、GCP でリファラー登録",
    },
  };

  const ok =
    checks.supabase.ok &&
    checks.jwt.ok &&
    checks.line.ok &&
    checks.googleDrive.ok &&
    checks.googleCalendar.ok &&
    checks.googleMaps.ok;

  return { ok, app: "pc", checks };
}
