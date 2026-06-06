import { NextRequest, NextResponse } from "next/server";
import {
  getFolderSettings,
  getPartnerShareSettings,
  getRolePermissionMatrix,
  getUserPermissionOverrides,
  listTenantUsers,
  updateFolderSettings,
  updatePartnerShareSettings,
  updateRolePermissionMatrix,
  updateUserPermissionOverrides,
  updateUserRole,
} from "@/lib/db/repository";
import {
  forbiddenResponse,
  getSessionFromRequest,
  unauthorizedResponse,
} from "@/lib/auth/session";
import type {
  AccessLevel,
  FolderSettings,
  PartnerDefaultMethod,
  ShareNotifyMethod,
  UserRole,
} from "@/lib/types";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();
  if (session.role !== "admin") return forbiddenResponse();

  const section = request.nextUrl.searchParams.get("section");
  const userId = request.nextUrl.searchParams.get("userId") ?? undefined;

  try {
    switch (section) {
      case "folder": {
        const folder = await getFolderSettings(session.tenantId);
        return NextResponse.json({ folder });
      }
      case "permissions": {
        if (userId) {
          const data = await getUserPermissionOverrides(
            session.tenantId,
            userId
          );
          return NextResponse.json(data);
        }
        const data = await getRolePermissionMatrix(session.tenantId);
        return NextResponse.json(data);
      }
      case "partner": {
        const partner = await getPartnerShareSettings(session.tenantId);
        return NextResponse.json({ partner });
      }
      case "users": {
        const users = await listTenantUsers(session.tenantId);
        return NextResponse.json({ users });
      }
      default:
        return NextResponse.json({ error: "invalid section" }, { status: 400 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();
  if (session.role !== "admin") return forbiddenResponse();

  try {
    const body = await request.json();
    const { section } = body as { section: string };

    switch (section) {
      case "folder": {
        const folder = await updateFolderSettings(
          session.tenantId,
          body.folder as Partial<FolderSettings>
        );
        return NextResponse.json({ folder });
      }
      case "role_permissions": {
        const data = await updateRolePermissionMatrix(
          session.tenantId,
          body.updates as {
            permissionId: string;
            role: UserRole;
            accessLevel: AccessLevel;
          }[],
          session.id
        );
        return NextResponse.json(data);
      }
      case "user_permissions": {
        const data = await updateUserPermissionOverrides(
          session.tenantId,
          body.userId as string,
          body.updates as {
            permissionId: string;
            accessLevel: AccessLevel | null;
          }[],
          session.id
        );
        return NextResponse.json(data);
      }
      case "partner": {
        const partner = await updatePartnerShareSettings(session.tenantId, {
          defaultMethod: body.defaultMethod as PartnerDefaultMethod | undefined,
          partners: body.partners as
            | {
                userId: string;
                shareNotifyMethod: ShareNotifyMethod;
                email?: string;
              }[]
            | undefined,
        });
        return NextResponse.json({ partner });
      }
      case "user_role": {
        const users = await updateUserRole(
          session.tenantId,
          body.userId as string,
          body.role as UserRole,
          session.id
        );
        return NextResponse.json({ users });
      }
      default:
        return NextResponse.json({ error: "invalid section" }, { status: 400 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "更新に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
