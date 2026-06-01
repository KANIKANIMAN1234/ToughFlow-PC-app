import { NextRequest, NextResponse } from "next/server";
import type { User } from "@/lib/types";

export const SESSION_COOKIE = "tf_session";

export function getSessionFromRequest(request: NextRequest): User | null {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setSessionCookie(response: NextResponse, user: User) {
  response.cookies.set(SESSION_COOKIE, JSON.stringify(user), {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
}

export function forbiddenResponse() {
  return NextResponse.json({ error: "権限がありません" }, { status: 403 });
}
