import { NextRequest, NextResponse } from "next/server";
import {
  clearLineOAuthCookie,
  readLineOAuthState,
} from "@/lib/auth/line-oauth";
import { setSessionCookie } from "@/lib/auth/session";
import { loginUserByLineId } from "@/lib/db/repository";
import {
  exchangeLineCode,
  fetchLineProfile,
  verifyLineIdToken,
} from "@/lib/line/oauth";
import { toSupabaseUserMessage } from "@/lib/supabase/admin";

function loginRedirect(request: NextRequest, message: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", message);
  const response = NextResponse.redirect(url);
  clearLineOAuthCookie(response);
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const lineError = searchParams.get("error_description") ?? searchParams.get("error");

  if (lineError) {
    return loginRedirect(request, `LINE 認証がキャンセルされました: ${lineError}`);
  }

  if (!code || !state) {
    return loginRedirect(request, "LINE 認証パラメータが不正です");
  }

  const oauth = readLineOAuthState(request);
  if (!oauth || oauth.state !== state) {
    return loginRedirect(request, "認証セッションが無効です。もう一度お試しください。");
  }

  try {
    const tokens = await exchangeLineCode(code);
    const profile = await verifyLineIdToken(tokens.id_token);

    if (profile.nonce && profile.nonce !== oauth.nonce) {
      return loginRedirect(request, "認証の検証に失敗しました");
    }

    let displayName = profile.name;
    if (!displayName) {
      try {
        const lineProfile = await fetchLineProfile(tokens.access_token);
        displayName = lineProfile.displayName;
      } catch {
        // 表示名なしでもユーザー自動作成は継続
      }
    }

    const returnTo = oauth.returnTo?.startsWith("/") ? oauth.returnTo : "/home";

    const user = await loginUserByLineId(
      oauth.tenantCode,
      profile.sub,
      displayName
    );

    const response = NextResponse.redirect(new URL(returnTo, request.url));
    setSessionCookie(response, user);
    clearLineOAuthCookie(response);
    return response;
  } catch (e) {
    const raw = e instanceof Error ? e.message : "LINE ログインに失敗しました";
    return loginRedirect(request, toSupabaseUserMessage(raw));
  }
}
