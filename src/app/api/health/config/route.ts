import { NextResponse } from "next/server";

import { getConfigStatus } from "@/lib/health/config-status";

/** 本番設定の診断（秘密情報は返さない） */
export async function GET() {
  const status = await getConfigStatus();
  return NextResponse.json(status, { status: status.ok ? 200 : 503 });
}
