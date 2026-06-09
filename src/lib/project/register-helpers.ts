import type { CustomerOption, ParsedProjectEmail } from "@/lib/types";

export function matchCustomerId(
  customers: CustomerOption[],
  customerName?: string
): string | undefined {
  if (!customerName?.trim()) return undefined;
  const normalized = customerName.trim();
  const exact = customers.find((c) => c.name === normalized);
  if (exact) return exact.id;
  const partial = customers.find(
    (c) => c.name.includes(normalized) || normalized.includes(c.name)
  );
  return partial?.id;
}

export function customerDisplayName(
  customers: CustomerOption[],
  customerId: string
): string {
  return customers.find((c) => c.id === customerId)?.name ?? "";
}

export function applyParsedProjectEmail(
  parsed: ParsedProjectEmail,
  customers: CustomerOption[]
) {
  const matchedId = matchCustomerId(customers, parsed.customerName);
  const matched = matchedId
    ? customers.find((c) => c.id === matchedId)
    : undefined;

  return {
    name: parsed.projectName ?? "",
    customerId: matchedId ?? "",
    customerName: parsed.customerName ?? matched?.name ?? "",
    address: parsed.address ?? matched?.address ?? "",
    clientContactName: parsed.clientContactName ?? "",
    clientContactTitle: parsed.clientContactTitle ?? "",
    clientContactPhone: parsed.clientContactPhone ?? "",
    clientContactEmail: parsed.clientContactEmail ?? "",
    projectSummary: parsed.projectSummary ?? "",
    workStartDate: parsed.workStartDate ?? "",
  };
}
