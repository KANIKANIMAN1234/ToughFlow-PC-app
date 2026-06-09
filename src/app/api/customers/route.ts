import { NextRequest, NextResponse } from "next/server";
import { formatDbError } from "@/lib/db/errors";
import {
  bulkCreateCustomers,
  createCustomer,
  listCustomers,
} from "@/lib/db/repository";
import { parseCustomerCsv } from "@/lib/customer/parse-customer-csv";
import { ensureDriveFoldersForCustomers } from "@/lib/customer/ensure-customer-drive-folders";
import { ensureCustomerDriveFolder } from "@/lib/google/drive";
import { isDriveConfigured } from "@/lib/google/client";
import { withAnyPermission, withPermission } from "@/lib/permissions/check";
import type { CreateCustomerInput } from "@/lib/types";

export async function GET(request: NextRequest) {
  return withAnyPermission(request, ["project_list_other"], async ({ session }) => {
    try {
      const customers = await listCustomers(session.tenantId);
      return NextResponse.json({ customers });
    } catch (e) {
      const message =
        e instanceof Error ? formatDbError(e.message) : "取得に失敗しました";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}

export async function POST(request: NextRequest) {
  return withPermission(request, "project_list_other", async ({ session }) => {
    try {
      const contentType = request.headers.get("content-type") ?? "";

      if (contentType.includes("multipart/form-data")) {
        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File) || file.size === 0) {
          return NextResponse.json(
            { error: "CSV ファイルを選択してください" },
            { status: 400 }
          );
        }

        const text = await file.text();
        const rows = parseCustomerCsv(text);
        if (rows.length === 0) {
          return NextResponse.json(
            { error: "CSV に登録対象の行がありません" },
            { status: 400 }
          );
        }

        const result = await bulkCreateCustomers(session.tenantId, rows);
        const drive = await ensureDriveFoldersForCustomers(
          session.tenantId,
          result.createdCustomers
        );
        return NextResponse.json({ ...result, ...drive }, { status: 201 });
      }

      const body = (await request.json()) as CreateCustomerInput;
      const customer = await createCustomer(session.tenantId, body);

      let driveFolderId: string | null = null;
      let driveWarning: string | undefined;
      if (isDriveConfigured()) {
        try {
          driveFolderId = await ensureCustomerDriveFolder(
            session.tenantId,
            customer.id,
            customer.name
          );
        } catch (e) {
          driveWarning =
            e instanceof Error ? e.message : "Google Drive フォルダ作成に失敗しました";
          console.error("[customers] drive folder failed:", e);
        }
      }

      return NextResponse.json(
        { customer, driveFolderId, driveWarning },
        { status: 201 }
      );
    } catch (e) {
      const message =
        e instanceof Error ? formatDbError(e.message) : "登録に失敗しました";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  });
}
