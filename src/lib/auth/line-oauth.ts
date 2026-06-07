import { NextRequest, NextResponse } from "next/server";

export const LINE_OAUTH_COOKIE = "tf_line_oauth";

export type LineOAuthState = {
  state: string;
  nonce: string;
  tenantCode: string;
  returnTo?: string;
};

export function readLineOAuthState(request: NextRequest): LineOAuthState | null {
  const raw = request.cookies.get(LINE_OAUTH_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LineOAuthState;
  } catch {
    return null;
  }
}

export function setLineOAuthCookie(
  response: NextResponse,
  payload: LineOAuthState
) {
  response.cookies.set(LINE_OAUTH_COOKIE, JSON.stringify(payload), {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 10,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearLineOAuthCookie(response: NextResponse) {
  response.cookies.set(LINE_OAUTH_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
}
