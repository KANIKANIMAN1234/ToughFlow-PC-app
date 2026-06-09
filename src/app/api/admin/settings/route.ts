import { NextRequest, NextResponse } from "next/server";
import {
  copyAgreement36FromPreviousYear,
  createTenantStaff,
  findEmploymentWorkRuleByScope,
  getAgreement36Settings,
  getEmploymentWorkRule,
  getFolderSettings,
  getPartnerShareSettings,
  getRolePermissionMatrix,
  getTenantStaff,
  getUserPermissionOverrides,
  listEmploymentOvertimeCalcTypes,
  listEmploymentWorkRules,
  listTenantStaff,
  updateFolderSettings,
  updatePartnerShareSettings,
  updateRolePermissionMatrix,
  updateTenantStaff,
  updateUserPermissionOverrides,
  updateUserRole,
  upsertAgreement36Fiscal,
  upsertAgreement36Global,
  upsertEmploymentWorkRule,
  deactivateTenantUser,
} from "@/lib/db/repository";
import { withPermission } from "@/lib/permissions/check";
import type {
  AccessLevel,
  Agreement36FiscalInput,
  Agreement36GlobalInput,
  EmploymentWorkRuleInput,
  FolderSettings,
  PartnerDefaultMethod,
  ShareNotifyMethod,
  StaffInput,
  StaffType,
  UserRole,
} from "@/lib/types";

export async function GET(request: NextRequest) {
  return withPermission(request, "admin_settings", async ({ session }) => {
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
        case "employment_work_rules": {
          const rules = await listEmploymentWorkRules(session.tenantId);
          return NextResponse.json({ rules });
        }
        case "employment_overtime_calc_types": {
          const overtimeCalcTypes = await listEmploymentOvertimeCalcTypes(
            session.tenantId
          );
          return NextResponse.json({ overtimeCalcTypes });
        }
        case "employment_agreement_36": {
          const fiscalYear = Number(
            request.nextUrl.searchParams.get("fiscalYear")
          );
          const data = await getAgreement36Settings(
            session.tenantId,
            fiscalYear > 0 ? fiscalYear : new Date().getFullYear()
          );
          return NextResponse.json(data);
        }
        case "employment_work_rule": {
          const ruleId = request.nextUrl.searchParams.get("ruleId") ?? undefined;
          const groupKey =
            request.nextUrl.searchParams.get("groupKey") ?? undefined;
          const staffTypeParam =
            request.nextUrl.searchParams.get("staffType") ?? undefined;
          const staffType =
            staffTypeParam && staffTypeParam !== ""
              ? (staffTypeParam as StaffType)
              : null;

          if (ruleId) {
            const rule = await getEmploymentWorkRule(session.tenantId, ruleId);
            if (!rule) {
              return NextResponse.json(
                { error: "設定が見つかりません" },
                { status: 404 }
              );
            }
            return NextResponse.json({ rule });
          }

          if (groupKey !== undefined) {
            const rule = await findEmploymentWorkRuleByScope(
              session.tenantId,
              groupKey,
              staffType
            );
            return NextResponse.json({ rule });
          }

          return NextResponse.json({ error: "invalid query" }, { status: 400 });
        }
        case "users":
        case "staff": {
          if (userId) {
            const staff = await getTenantStaff(session.tenantId, userId);
            if (!staff) {
              return NextResponse.json(
                { error: "スタッフが見つかりません" },
                { status: 404 }
              );
            }
            return NextResponse.json({ staff });
          }
          const staff = await listTenantStaff(session.tenantId);
          return NextResponse.json({ staff, users: staff });
        }
        default:
          return NextResponse.json({ error: "invalid section" }, { status: 400 });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "取得に失敗しました";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}

export async function POST(request: NextRequest) {
  return withPermission(request, "admin_settings", async ({ session }) => {
    try {
      const body = await request.json();
      const { section } = body as { section: string };

      if (section === "staff_create") {
        const staff = await createTenantStaff(
          session.tenantId,
          body.staff as StaffInput
        );
        return NextResponse.json({ staff });
      }

      return NextResponse.json({ error: "invalid section" }, { status: 400 });
    } catch (e) {
      const message = e instanceof Error ? e.message : "登録に失敗しました";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  });
}

export async function PATCH(request: NextRequest) {
  return withPermission(request, "admin_settings", async ({ session }) => {
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
        case "employment_agreement_36": {
          const global = body.global as Agreement36GlobalInput | undefined;
          const fiscal = body.fiscal as Agreement36FiscalInput | undefined;
          if (global) {
            await upsertAgreement36Global(
              session.tenantId,
              global,
              session.id
            );
          }
          const savedFiscal = fiscal
            ? await upsertAgreement36Fiscal(
                session.tenantId,
                fiscal,
                session.id
              )
            : undefined;
          const refreshed = await getAgreement36Settings(
            session.tenantId,
            fiscal?.fiscalYear ?? new Date().getFullYear()
          );
          return NextResponse.json({
            ...refreshed,
            fiscal: savedFiscal ?? refreshed.fiscal,
          });
        }
        case "employment_agreement_36_copy": {
          const fiscalYear = Number(body.fiscalYear);
          if (!fiscalYear) {
            return NextResponse.json(
              { error: "fiscalYear required" },
              { status: 400 }
            );
          }
          const fiscal = await copyAgreement36FromPreviousYear(
            session.tenantId,
            fiscalYear,
            session.id
          );
          return NextResponse.json({ fiscal });
        }
        case "employment_work_rule": {
          const rule = await upsertEmploymentWorkRule(
            session.tenantId,
            body.rule as EmploymentWorkRuleInput,
            session.id,
            body.ruleId as string | undefined
          );
          return NextResponse.json({ rule });
        }
        case "staff_update": {
          const staff = await updateTenantStaff(
            session.tenantId,
            body.userId as string,
            body.staff as StaffInput,
            session.id
          );
          return NextResponse.json({ staff });
        }
        case "user_deactivate": {
          const users = await deactivateTenantUser(
            session.tenantId,
            body.userId as string,
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
  });
}
