import type { calendar_v3 } from "googleapis";

import { getCalendarClient, getCalendarId, isCalendarConfigured } from "./client";

function formatGoogleCalendarError(error: unknown): string {
  const apiMessage = (
    error as { response?: { data?: { error?: { message?: string } } } }
  ).response?.data?.error?.message;

  if (apiMessage) {
    if (apiMessage.includes("Not Found")) {
      return "Googleカレンダーが見つかりません。GOOGLE_CALENDAR_ID とカレンダー共有設定を確認してください。";
    }
    if (apiMessage.includes("Forbidden") || apiMessage.includes("permission")) {
      return "Googleカレンダーへのアクセスが拒否されました。サービスアカウントへの共有（変更権限）を確認してください。";
    }
    return `Google Calendar API: ${apiMessage}`;
  }

  if (error instanceof Error) return error.message;
  return "取得に失敗しました";
}

export type GoogleCalendarEvent = {
  id: string;
  title: string;
  description: string;
  location: string;
  dateKey: string;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  assignees: string[];
};

const JST = "Asia/Tokyo";

function toJstDateKey(value: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: JST }).format(new Date(value));
}

function toJstTime(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: JST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function rangeToIsoBounds(from: string, to: string) {
  return {
    timeMin: new Date(`${from}T00:00:00+09:00`).toISOString(),
    timeMax: new Date(`${to}T23:59:59+09:00`).toISOString(),
  };
}

function mapGoogleEvent(item: calendar_v3.Schema$Event): GoogleCalendarEvent | null {
  const start = item.start;
  if (!start || !item.id) return null;

  const allDay = Boolean(start.date);
  const dateKey = start.date ?? (start.dateTime ? toJstDateKey(start.dateTime) : "");
  if (!dateKey) return null;

  const assignees =
    item.attendees
      ?.filter((a) => !a.self && !a.organizer && a.responseStatus !== "declined")
      .map((a) => a.displayName?.trim() || a.email?.trim() || "")
      .filter(Boolean) ?? [];

  return {
    id: item.id,
    title: item.summary?.trim() || "（タイトルなし）",
    description: item.description?.trim() ?? "",
    location: item.location?.trim() ?? "",
    dateKey,
    allDay,
    startTime: start.dateTime ? toJstTime(start.dateTime) : null,
    endTime: item.end?.dateTime ? toJstTime(item.end.dateTime) : null,
    assignees,
  };
}

export async function listGoogleCalendarEvents(
  from: string,
  to: string
): Promise<GoogleCalendarEvent[]> {
  if (!isCalendarConfigured()) {
    throw new Error("Google Calendar が未設定です（GOOGLE_CALENDAR_ID）");
  }

  const calendarId = getCalendarId();
  const calendar = await getCalendarClient();
  if (!calendar || !calendarId) {
    throw new Error("Google Calendar クライアントの初期化に失敗しました");
  }

  const { timeMin, timeMax } = rangeToIsoBounds(from, to);
  const events: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;

  try {
    do {
      const res = await calendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 2500,
        pageToken,
      });

      for (const item of res.data.items ?? []) {
        const mapped = mapGoogleEvent(item);
        if (mapped) events.push(mapped);
      }

      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);
  } catch (error) {
    throw new Error(formatGoogleCalendarError(error));
  }

  return events;
}
