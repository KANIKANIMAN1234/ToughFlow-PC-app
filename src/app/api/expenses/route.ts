import { NextRequest, NextResponse } from "next/server";
import { listExpenses, updateExpenseStatus } from "@/lib/store/mock-store";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status") as
    | "submitted"
    | undefined;
  const userId = request.nextUrl.searchParams.get("userId") ?? undefined;
  return NextResponse.json({
    expenses: listExpenses({ status: status ?? undefined, userId }),
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, status } = body as { id: string; status: "approved" | "rejected" };
  const expense = updateExpenseStatus(id, status);
  if (!expense) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ expense });
}
