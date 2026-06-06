import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "@/lib/db/repository";
import {
  clearSessionCookie,
  getSessionFromRequest,
  setSessionCookie,
} from "@/lib/auth/session";
import { toSupabaseUserMessage } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantCode, userName, role } = body as {
      tenantCode: string;
      userName: string;
      role?: UserRole;
    };

    const user = await loginUser(tenantCode, userName, role);
    const response = NextResponse.json({ user });
    setSessionCookie(response, user);
    return response;
  } catch (e) {
    const raw = e instanceof Error ? e.message : "ログインに失敗しました";
    const message = toSupabaseUserMessage(raw);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const user = getSessionFromRequest(request);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
