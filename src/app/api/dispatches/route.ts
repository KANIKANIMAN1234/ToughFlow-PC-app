import { NextRequest, NextResponse } from "next/server";
import {
  getDispatch,
  listDispatches,
  updateDispatch,
} from "@/lib/db/repository";
import { requireAnyPermission, requirePermission } from "@/lib/permissions/check";

export async function GET(request: NextRequest) {
  const auth = await requireAnyPermission(request, [
    "dispatch_list_view",
    "dispatch_view",
  ]);
  if (auth instanceof Response) return auth;

  const tab = request.nextUrl.searchParams.get("tab") as "today" | "future" | null;
  const id = request.nextUrl.searchParams.get("id");

  try {
    if (id) {
      const dispatch = await getDispatch(auth.session.tenantId, id);
      if (!dispatch) {
        return NextResponse.json({ error: "not found" }, { status: 404 });
      }
      return NextResponse.json({ dispatch });
    }
    const dispatches = await listDispatches(auth.session.tenantId, {
      tab: tab ?? undefined,
    });
    return NextResponse.json({ dispatches });
  } catch (e) {
    const message = e instanceof Error ? e.message : "取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requirePermission(request, "dispatch_edit");
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const { id, ...patch } = body as {
      id: string;
      status?: "draft" | "confirmed";
    };
    const dispatch = await updateDispatch(auth.session.tenantId, id, patch);
    if (!dispatch) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ dispatch });
  } catch (e) {
    const message = e instanceof Error ? e.message : "更新に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
