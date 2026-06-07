import { NextRequest, NextResponse } from "next/server";
import { listExpenses, updateExpenseStatus } from "@/lib/db/repository";
import { withPermission } from "@/lib/permissions/check";

export async function GET(request: NextRequest) {
  return withPermission(request, "expense_approve", async ({ session }) => {
    const status = request.nextUrl.searchParams.get("status") as
      | "submitted"
      | undefined;
    const userId = request.nextUrl.searchParams.get("userId") ?? undefined;

    try {
      const expenses = await listExpenses(session.tenantId, {
        status: status ?? undefined,
        userId,
      });
      return NextResponse.json({ expenses });
    } catch (e) {
      const message = e instanceof Error ? e.message : "取得に失敗しました";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}

export async function PATCH(request: NextRequest) {
  return withPermission(request, "expense_approve", async ({ session }) => {
    try {
      const body = await request.json();
      const { id, status } = body as { id: string; status: "approved" | "rejected" };
      const expense = await updateExpenseStatus(
        session.tenantId,
        id,
        status,
        session.id
      );
      if (!expense) {
        return NextResponse.json({ error: "not found" }, { status: 404 });
      }
      return NextResponse.json({ expense });
    } catch (e) {
      const message = e instanceof Error ? e.message : "更新に失敗しました";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
