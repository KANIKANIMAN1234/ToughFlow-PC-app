import type { GoogleCalendarEvent } from "@/lib/google/calendar";

export function eventShortLabel(event: GoogleCalendarEvent): string {
  const title = event.title.trim() || "（タイトルなし）";
  if (title.length <= 10) return title;
  return `${title.slice(0, 9)}…`;
}

export function groupEventsByDate(
  events: GoogleCalendarEvent[]
): Map<string, GoogleCalendarEvent[]> {
  const map = new Map<string, GoogleCalendarEvent[]>();
  for (const event of events) {
    const list = map.get(event.dateKey) ?? [];
    list.push(event);
    map.set(event.dateKey, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.title.localeCompare(b.title, "ja"));
  }
  return map;
}

export function groupEventsByPerson(
  events: GoogleCalendarEvent[]
): { assignee: string; rows: GoogleCalendarEvent[] }[] {
  const map = new Map<string, GoogleCalendarEvent[]>();

  for (const event of events) {
    const people =
      event.assignees.length > 0 ? event.assignees : ["（担当未設定）"];
    for (const person of people) {
      const list = map.get(person) ?? [];
      list.push(event);
      map.set(person, list);
    }
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "ja"))
    .map(([assignee, rows]) => ({
      assignee,
      rows: rows.sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
    }));
}

export function groupEventsBySite(
  events: GoogleCalendarEvent[]
): { siteLabel: string; rows: GoogleCalendarEvent[] }[] {
  const map = new Map<string, GoogleCalendarEvent[]>();

  for (const event of events) {
    const site = event.location.trim() || event.title.trim() || "（現場未設定）";
    const list = map.get(site) ?? [];
    list.push(event);
    map.set(site, list);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "ja"))
    .map(([siteLabel, rows]) => ({
      siteLabel,
      rows: rows.sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
    }));
}

export function formatEventTime(event: GoogleCalendarEvent): string {
  if (event.allDay) return "終日";
  if (event.startTime && event.endTime) {
    return `${event.startTime}〜${event.endTime}`;
  }
  return event.startTime ?? "—";
}
