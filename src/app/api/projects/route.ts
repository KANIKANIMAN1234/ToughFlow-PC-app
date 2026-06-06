import { NextRequest, NextResponse } from "next/server";
import { listProjects } from "@/lib/db/repository";
import {
  getSessionFromRequest,
  unauthorizedResponse,
} from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();

  try {
    const projects = await listProjects(session.tenantId, {
      userId: session.id,
      role: session.role,
    });
    return NextResponse.json({ projects });
  } catch (e) {
    const message = e instanceof Error ? e.message : "取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
