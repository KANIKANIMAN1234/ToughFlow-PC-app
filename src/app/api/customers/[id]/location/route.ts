import { NextRequest, NextResponse } from "next/server";
import { formatDbError } from "@/lib/db/errors";
import { updateCustomerLocation } from "@/lib/db/repository";
import { withPermission } from "@/lib/permissions/check";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  return withPermission(request, "project_list_other", async ({ session }) => {
    try {
      const { id } = await params;
      const body = (await request.json()) as { lat?: number; lng?: number };

      if (typeof body.lat !== "number" || typeof body.lng !== "number") {
        return NextResponse.json(
          { error: "座標（lat, lng）が不正です" },
          { status: 400 }
        );
      }

      await updateCustomerLocation(session.tenantId, id, body.lat, body.lng);
      return NextResponse.json({ ok: true });
    } catch (e) {
      const message =
        e instanceof Error ? formatDbError(e.message) : "保存に失敗しました";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  });
}
