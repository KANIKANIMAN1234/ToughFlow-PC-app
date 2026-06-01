import { NextRequest, NextResponse } from "next/server";
import {
  getDispatch,
  listDispatches,
  updateDispatch,
} from "@/lib/db/repository";
import {
  getSessionFromRequest,
  unauthorizedResponse,
} from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();

  const tab = request.nextUrl.searchParams.get("tab") as "today" | "future" | null;
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
      tab: tab ?? undefined,
    });
    return NextResponse.json({ dispatches });
  } catch (e) {
    const message = e instanceof Error ? e.message : "取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();

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
}
