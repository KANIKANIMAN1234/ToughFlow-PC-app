import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  clearLineOAuthCookie,
  setLineOAuthCookie,
} from "@/lib/auth/line-oauth";
import { getLineConfig } from "@/lib/line/config";
import { buildLineAuthorizeUrl } from "@/lib/line/oauth";
import { resolveTenantByCodeForLine } from "@/lib/line/tenant";

export async function GET(request: NextRequest) {
  const tenantCode = request.nextUrl.searchParams.get("tenantCode")?.trim();
  const returnTo = request.nextUrl.searchParams.get("returnTo") ?? "/home";

  if (!tenantCode) {
    return NextResponse.redirect(
      new URL("/login?error=会社コードを入力してください", request.url)
    );
  }

  const config = getLineConfig();
  if (!config.loginEnabled) {
    return NextResponse.redirect(
      new URL("/login?error=LINE Login が未設定です", request.url)
    );
  }

  try {
    await resolveTenantByCodeForLine(tenantCode);
  } catch (e) {
    const message = e instanceof Error ? e.message : "会社コードが正しくありません";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, request.url)
    );
  }

  const state = randomUUID();
  const nonce = randomUUID();
  const authorizeUrl = buildLineAuthorizeUrl({ state, nonce });

  const response = NextResponse.redirect(authorizeUrl);
  setLineOAuthCookie(response, {
    state,
    nonce,
    tenantCode: tenantCode.toUpperCase(),
    returnTo: returnTo.startsWith("/") ? returnTo : "/home",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearLineOAuthCookie(response);
  return response;
}
