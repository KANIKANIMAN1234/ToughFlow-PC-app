import { NextRequest, NextResponse } from "next/server";
import {
  listVendorPayments,
  updateVendorPaymentStatus,
} from "@/lib/db/repository";
import {
  getSessionFromRequest,
  unauthorizedResponse,
} from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();

  const unpaidOnly = request.nextUrl.searchParams.get("unpaidOnly") === "true";
  const status = request.nextUrl.searchParams.get("status") as
    | "confirmed"
    | "paid"
    | undefined;

  try {
    const payments = await listVendorPayments(session.tenantId, {
      unpaidOnly,
      status,
    });
    return NextResponse.json({ payments });
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
    const { id, status } = body as { id: string; status: "paid" };
    const payment = await updateVendorPaymentStatus(
      session.tenantId,
      id,
      status,
      session.id
    );
    if (!payment) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ payment });
  } catch (e) {
    const message = e instanceof Error ? e.message : "更新に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
