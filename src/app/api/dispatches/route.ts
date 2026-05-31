import { NextRequest, NextResponse } from "next/server";
import { getDispatch, listDispatches, updateDispatch } from "@/lib/store/mock-store";

export async function GET(request: NextRequest) {
  const tab = request.nextUrl.searchParams.get("tab") as "today" | "future" | null;
  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    const row = getDispatch(id);
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ dispatch: row });
  }
  return NextResponse.json({
    dispatches: listDispatches({ tab: tab ?? undefined }),
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, ...patch } = body as { id: string; status?: "draft" | "confirmed" };
  const row = updateDispatch(id, patch);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ dispatch: row });
}
