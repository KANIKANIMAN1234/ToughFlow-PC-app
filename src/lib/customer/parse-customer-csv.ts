import type { CreateCustomerInput } from "@/lib/types";

const NAME_HEADERS = new Set(["顧客名", "name", "名称", "会社名", "取引先名"]);
const ADDRESS_HEADERS = new Set(["住所", "address", "所在地", "address1"]);

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }

  result.push(current.trim());
  return result;
}

function normalizeHeader(value: string): string {
  return value.replace(/^\uFEFF/, "").trim();
}

export function parseCustomerCsv(text: string): CreateCustomerInput[] {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const lines = normalized.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const firstCells = parseCsvLine(lines[0]).map(normalizeHeader);
  const nameIndex = firstCells.findIndex((cell) => NAME_HEADERS.has(cell));
  const addressIndex = firstCells.findIndex((cell) => ADDRESS_HEADERS.has(cell));
  const hasHeader = nameIndex >= 0;

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const resolvedNameIndex = hasHeader ? nameIndex : 0;
  const resolvedAddressIndex = hasHeader
    ? addressIndex
    : firstCells.length > 1
      ? 1
      : -1;

  if (resolvedNameIndex < 0) {
    throw new Error(
      "CSV の1行目に「顧客名」列が見つかりません。ヘッダー例: 顧客名,住所"
    );
  }

  return dataLines.map((line) => {
    const cells = parseCsvLine(line);
    return {
      name: cells[resolvedNameIndex]?.trim() ?? "",
      address:
        resolvedAddressIndex >= 0
          ? cells[resolvedAddressIndex]?.trim() || undefined
          : undefined,
    };
  });
}

export const CUSTOMER_CSV_TEMPLATE = "顧客名,住所\nサンプル株式会社,埼玉県川口市";
