import { assertLineConfig } from "./config";

const LINE_AUTH_URL = "https://access.line.me/oauth2/v2.1/authorize";
const LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const LINE_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";

export type LineTokenResponse = {
  access_token: string;
  expires_in: number;
  id_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
};

export type LineIdTokenPayload = {
  sub: string;
  name?: string;
  picture?: string;
  email?: string;
  aud: string;
  exp: number;
  iat: number;
  nonce?: string;
  amr?: string[];
};

export function buildLineAuthorizeUrl(params: {
  state: string;
  nonce: string;
}): string {
  const { channelId, callbackUrl } = assertLineConfig();
  const search = new URLSearchParams({
    response_type: "code",
    client_id: channelId,
    redirect_uri: callbackUrl,
    state: params.state,
    scope: "profile openid",
    nonce: params.nonce,
  });
  return `${LINE_AUTH_URL}?${search.toString()}`;
}

export async function exchangeLineCode(code: string): Promise<LineTokenResponse> {
  const { channelId, channelSecret, callbackUrl } = assertLineConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: callbackUrl,
    client_id: channelId,
    client_secret: channelSecret,
  });

  const res = await fetch(LINE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`LINE トークン取得に失敗しました: ${detail}`);
  }

  return (await res.json()) as LineTokenResponse;
}

export async function verifyLineIdToken(
  idToken: string
): Promise<LineIdTokenPayload> {
  const { channelId } = assertLineConfig();
  const body = new URLSearchParams({
    id_token: idToken,
    client_id: channelId,
  });

  const res = await fetch(LINE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`LINE ID トークン検証に失敗しました: ${detail}`);
  }

  return (await res.json()) as LineIdTokenPayload;
}

export async function fetchLineProfile(accessToken: string): Promise<{
  userId: string;
  displayName: string;
  pictureUrl?: string;
}> {
  const res = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`LINE プロフィール取得に失敗しました: ${detail}`);
  }

  const data = (await res.json()) as {
    userId: string;
    displayName: string;
    pictureUrl?: string;
  };
  return data;
}
