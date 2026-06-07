import { NextRequest, NextResponse } from "next/server";
import type { AccessLevel, User } from "@/lib/types";
import { getUserAccessMap } from "@/lib/db/repository";
import {
  forbiddenResponse,
  getSessionFromRequest,
  unauthorizedResponse,
} from "@/lib/auth/session";
import { isAccessGranted } from "@/lib/permissions/access";
import { runWithDbContext } from "@/lib/supabase/context";

export type PermissionCode = string;

export type AuthContext = {
  session: User;
  accessMap: Record<string, AccessLevel>;
};

export { isAccessGranted };

export async function resolveAccess(
  tenantId: string,
  userId: string,
  role: User["role"],
  permissionCode: PermissionCode,
  accessMap?: Record<string, AccessLevel>
): Promise<AccessLevel> {
  const map = accessMap ?? (await getUserAccessMap(tenantId, userId, role));
  return map[permissionCode] ?? "deny";
}

/** 認証済みセッションで RLS コンテキスト内の処理を実行 */
export async function withDbSession(
  request: NextRequest,
  handler: (session: User) => Promise<NextResponse>
): Promise<NextResponse> {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();
  return runWithDbContext(session, () => handler(session));
}

/** 単一権限チェック + RLS コンテキスト内でハンドラ実行 */
export async function withPermission(
  request: NextRequest,
  permissionCode: PermissionCode,
  handler: (ctx: AuthContext) => Promise<NextResponse>
): Promise<NextResponse> {
  return withDbSession(request, async (session) => {
    const accessMap = await getUserAccessMap(
      session.tenantId,
      session.id,
      session.role
    );
    const level = accessMap[permissionCode] ?? "deny";
    if (!isAccessGranted(level)) return forbiddenResponse();
    return handler({ session, accessMap });
  });
}

/** いずれかの権限で可 + RLS コンテキスト内でハンドラ実行 */
export async function withAnyPermission(
  request: NextRequest,
  permissionCodes: PermissionCode[],
  handler: (ctx: AuthContext) => Promise<NextResponse>
): Promise<NextResponse> {
  return withDbSession(request, async (session) => {
    const accessMap = await getUserAccessMap(
      session.tenantId,
      session.id,
      session.role
    );
    const granted = permissionCodes.some((code) =>
      isAccessGranted(accessMap[code] ?? "deny")
    );
    if (!granted) return forbiddenResponse();
    return handler({ session, accessMap });
  });
}

/** @deprecated withPermission を使用（RLS コンテキスト外では repository が動作しません） */
export async function requirePermission(
  request: NextRequest,
  permissionCode: PermissionCode
): Promise<AuthContext | NextResponse> {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();

  return runWithDbContext(session, async () => {
    const accessMap = await getUserAccessMap(
      session.tenantId,
      session.id,
      session.role
    );
    const level = accessMap[permissionCode] ?? "deny";
    if (!isAccessGranted(level)) return forbiddenResponse();
    return { session, accessMap };
  });
}

/** @deprecated withAnyPermission を使用 */
export async function requireAnyPermission(
  request: NextRequest,
  permissionCodes: PermissionCode[]
): Promise<AuthContext | NextResponse> {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();

  return runWithDbContext(session, async () => {
    const accessMap = await getUserAccessMap(
      session.tenantId,
      session.id,
      session.role
    );
    const granted = permissionCodes.some((code) =>
      isAccessGranted(accessMap[code] ?? "deny")
    );
    if (!granted) return forbiddenResponse();
    return { session, accessMap };
  });
}
