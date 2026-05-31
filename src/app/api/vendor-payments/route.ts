import { NextRequest, NextResponse } from "next/server";
import {
  listVendorPayments,
  updateVendorPaymentStatus,
} from "@/lib/store/mock-store";

export async function GET(request: NextRequest) {
  const unpaidOnly = request.nextUrl.searchParams.get("unpaidOnly") === "true";
  const status = request.nextUrl.searchParams.get("status") as
    | "confirmed"
    | "paid"
    | undefined;
  return NextResponse.json({
    payments: listVendorPayments({ unpaidOnly, status }),
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, status } = body as { id: string; status: "paid" };
  const payment = updateVendorPaymentStatus(id, status);
  if (!payment) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ payment });
}
