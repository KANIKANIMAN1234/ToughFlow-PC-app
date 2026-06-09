import { ensureCustomerDriveFolder } from "@/lib/google/drive";
import { isDriveConfigured } from "@/lib/google/client";

export async function ensureDriveFoldersForCustomers(
  tenantId: string,
  customers: { id: string; name: string }[]
): Promise<{ driveFoldersCreated: number; driveWarnings: string[] }> {
  if (!isDriveConfigured() || customers.length === 0) {
    return { driveFoldersCreated: 0, driveWarnings: [] };
  }

  let driveFoldersCreated = 0;
  const driveWarnings: string[] = [];

  for (const customer of customers) {
    try {
      const folderId = await ensureCustomerDriveFolder(
        tenantId,
        customer.id,
        customer.name
      );
      if (folderId) driveFoldersCreated += 1;
    } catch (e) {
      const message = e instanceof Error ? e.message : "フォルダ作成に失敗しました";
      driveWarnings.push(`${customer.name}: ${message}`);
      console.error("[customers] drive folder failed:", customer.name, e);
    }
  }

  return { driveFoldersCreated, driveWarnings };
}
