const JST = "Asia/Tokyo";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function workDateJst(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: JST }).format(date);
}

/** 集計基準日（前日）。アラートは翌日午前0時頃送信のため前日までを評価する */
export function evaluationWorkDate(reference = new Date()): string {
  const today = workDateJst(reference);
  const d = new Date(`${today}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function monthRangeUpTo(workDate: string): { fromDate: string; toDate: string } {
  const d = new Date(`${workDate}T12:00:00`);
  const fromDate = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`;
  return { fromDate, toDate: workDate };
}

export function weekRangeUpTo(workDate: string): { fromDate: string; toDate: string } {
  const d = new Date(`${workDate}T12:00:00`);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  return {
    fromDate: monday.toISOString().slice(0, 10),
    toDate: workDate,
  };
}

export function fiscalYearRange(
  fiscalYear: number,
  startMonth: number,
  startDay: number
): { fromDate: string; toDate: string } {
  const fromDate = `${fiscalYear}-${pad2(startMonth)}-${pad2(startDay)}`;
  const endYear = startMonth === 1 ? fiscalYear : fiscalYear + 1;
  const endMonth = startMonth === 1 ? 12 : startMonth - 1;
  const lastDay = new Date(endYear, endMonth, 0).getDate();
  const toDate = `${endYear}-${pad2(endMonth)}-${pad2(lastDay)}`;
  return { fromDate, toDate };
}

export function fiscalYearRangeUpTo(
  fiscalYear: number,
  startMonth: number,
  startDay: number,
  workDate: string
): { fromDate: string; toDate: string } {
  const full = fiscalYearRange(fiscalYear, startMonth, startDay);
  return {
    fromDate: full.fromDate,
    toDate: workDate < full.toDate ? workDate : full.toDate,
  };
}

/** 指定範囲内の各暦月（YYYY-MM-01 〜 月末） */
export function calendarMonthsInRange(
  fromDate: string,
  toDate: string
): { fromDate: string; toDate: string }[] {
  const start = new Date(`${fromDate}T12:00:00`);
  const end = new Date(`${toDate}T12:00:00`);
  const months: { fromDate: string; toDate: string }[] = [];

  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const monthStart = `${year}-${pad2(month + 1)}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const monthEnd = `${year}-${pad2(month + 1)}-${pad2(lastDay)}`;
    months.push({
      fromDate: monthStart < fromDate ? fromDate : monthStart,
      toDate: monthEnd > toDate ? toDate : monthEnd,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

/** 直近 count か月（評価日を含む月を最終月とする） */
export function recentMonthRanges(
  workDate: string,
  count: number
): { fromDate: string; toDate: string }[] {
  const end = new Date(`${workDate}T12:00:00`);
  const ranges: { fromDate: string; toDate: string }[] = [];

  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthStart = `${year}-${pad2(month + 1)}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const monthEnd = `${year}-${pad2(month + 1)}-${pad2(lastDay)}`;
    ranges.push({
      fromDate: monthStart,
      toDate: monthEnd > workDate ? workDate : monthEnd,
    });
  }

  return ranges;
}
