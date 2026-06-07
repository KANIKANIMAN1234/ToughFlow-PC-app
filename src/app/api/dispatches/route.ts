import { NextRequest, NextResponse } from "next/server";

import {

  getDispatch,

  listDispatches,

  updateDispatch,

} from "@/lib/db/repository";

import { withAnyPermission, withPermission } from "@/lib/permissions/check";



export async function GET(request: NextRequest) {

  return withAnyPermission(

    request,

    ["dispatch_list_view", "dispatch_view"],

    async ({ session }) => {

      const tab = request.nextUrl.searchParams.get("tab") as "today" | "future" | null;
      const from = request.nextUrl.searchParams.get("from") ?? undefined;
      const to = request.nextUrl.searchParams.get("to") ?? undefined;
      const id = request.nextUrl.searchParams.get("id");

      try {
        if (id) {
          const dispatch = await getDispatch(session.tenantId, id);
          if (!dispatch) {
            return NextResponse.json({ error: "not found" }, { status: 404 });
          }
          return NextResponse.json({ dispatch });
        }

        const dispatches = await listDispatches(session.tenantId, {
          tab: from || to ? undefined : tab ?? undefined,
          from,
          to,
        });

        return NextResponse.json({ dispatches });

      } catch (e) {

        const message = e instanceof Error ? e.message : "取得に失敗しました";

        return NextResponse.json({ error: message }, { status: 500 });

      }

    }

  );

}



export async function PATCH(request: NextRequest) {

  return withPermission(request, "dispatch_edit", async ({ session }) => {

    try {

      const body = await request.json();

      const { id, ...patch } = body as {

        id: string;

        status?: "draft" | "confirmed";

      };

      const dispatch = await updateDispatch(session.tenantId, id, patch);

      if (!dispatch) {

        return NextResponse.json({ error: "not found" }, { status: 404 });

      }

      return NextResponse.json({ dispatch });

    } catch (e) {

      const message = e instanceof Error ? e.message : "更新に失敗しました";

      return NextResponse.json({ error: message }, { status: 500 });

    }

  });

}

