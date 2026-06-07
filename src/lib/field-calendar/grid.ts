export type CalendarViewMode = "calendar" | "person" | "site";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function getMonthRange(
  year: number,
  month: number
): { from: string; to: string } {
  const from = `${year}-${pad2(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${pad2(month)}-${pad2(lastDay)}`;
  return { from, to };
}

export function getTodayKey(): string {
  return toDateKey(new Date());
}

export type CalendarCell = {
  dateKey: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
};

/** 日曜始まりの月間カレンダーグリッド（6週×7日） */
export function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const todayKey = getTodayKey();
  const first = new Date(year, month - 1, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: CalendarCell[] = [];

  for (let i = 0; i < startOffset; i++) {
    const d = new Date(year, month - 1, -startOffset + i + 1);
    cells.push({
      dateKey: toDateKey(d),
      day: d.getDate(),
      inMonth: false,
      isToday: toDateKey(d) === todayKey,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    const dateKey = toDateKey(d);
    cells.push({
      dateKey,
      day,
      inMonth: true,
      isToday: dateKey === todayKey,
    });
  }

  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    const d = parseDateKey(last.dateKey);
    d.setDate(d.getDate() + 1);
    const dateKey = toDateKey(d);
    cells.push({
      dateKey,
      day: d.getDate(),
      inMonth: false,
      isToday: dateKey === todayKey,
    });
  }

  while (cells.length < 42) {
    const last = cells[cells.length - 1];
    const d = parseDateKey(last.dateKey);
    d.setDate(d.getDate() + 1);
    const dateKey = toDateKey(d);
    cells.push({
      dateKey,
      day: d.getDate(),
      inMonth: false,
      isToday: dateKey === todayKey,
    });
  }

  return cells;
}

export function formatMonthTitle(year: number, month: number): string {
  return `${year}年${month}月`;
}

export { WEEKDAY_LABELS };
