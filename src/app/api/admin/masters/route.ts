import { NextRequest, NextResponse } from "next/server";

import {

  addMasterItem,

  getCompanyInfo,

  listMaster,

  resetMasterSeed,

  updateCompanyInfo,

  updateMasterItem,

} from "@/lib/db/repository";

import { withAnyPermission, withPermission } from "@/lib/permissions/check";

import type { MasterType } from "@/lib/types";



export async function GET(request: NextRequest) {

  return withAnyPermission(

    request,

    ["master_manage", "master_view"],

    async ({ session }) => {

      const type = request.nextUrl.searchParams.get("type") as MasterType | null;

      const includeInactive =

        request.nextUrl.searchParams.get("includeInactive") === "true";



      try {

        if (type) {

          const items = await listMaster(session.tenantId, type, includeInactive);

          return NextResponse.json({ items });

        }

        const companyInfo = await getCompanyInfo(session.tenantId);

        return NextResponse.json({ companyInfo });

      } catch (e) {

        const message = e instanceof Error ? e.message : "取得に失敗しました";

        return NextResponse.json({ error: message }, { status: 500 });

      }

    }

  );

}



export async function POST(request: NextRequest) {

  return withPermission(request, "master_manage", async ({ session }) => {

    try {

      const body = await request.json();

      const { type, action, item } = body as {

        type: MasterType;

        action?: "reset";

        item?: Record<string, unknown>;

      };



      if (action === "reset") {

        const items = await resetMasterSeed(session.tenantId, type);

        return NextResponse.json({ items });

      }



      const created = await addMasterItem(

        session.tenantId,

        type,

        item ?? { name: "新規項目" }

      );

      return NextResponse.json({ item: created }, { status: 201 });

    } catch (e) {

      const message = e instanceof Error ? e.message : "登録に失敗しました";

      return NextResponse.json({ error: message }, { status: 500 });

    }

  });

}



export async function PATCH(request: NextRequest) {

  return withPermission(request, "master_manage", async ({ session }) => {

    try {

      const body = await request.json();

      const { type, id, patch, companyInfo } = body as {

        type?: MasterType;

        id?: string;

        patch?: Record<string, unknown>;

        companyInfo?: Record<string, string>;

      };



      if (companyInfo) {

        const updated = await updateCompanyInfo(session.tenantId, companyInfo);

        return NextResponse.json({ companyInfo: updated });

      }



      if (!type || !id || !patch) {

        return NextResponse.json({ error: "invalid request" }, { status: 400 });

      }



      const updated = await updateMasterItem(session.tenantId, type, id, patch);

      if (!updated) {

        return NextResponse.json({ error: "not found" }, { status: 404 });

      }

      return NextResponse.json({ item: updated });

    } catch (e) {

      const message = e instanceof Error ? e.message : "更新に失敗しました";

      return NextResponse.json({ error: message }, { status: 500 });

    }

  });

}

