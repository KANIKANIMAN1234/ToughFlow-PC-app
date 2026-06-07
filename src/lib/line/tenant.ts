import { createAdminClient } from "@/lib/supabase/admin";
import { formatDbError } from "@/lib/db/errors";

export async function resolveTenantByCodeForLine(tenantCode: string) {
  const supabase = createAdminClient();
  const code = tenantCode.trim().toUpperCase();

  const { data: tenant, error } = await supabase
    .from("m_tenant")
    .select("id, name, status")
    .eq("tenant_code", code)
    .maybeSingle();

  if (error) throw new Error(formatDbError(error.message));
  if (!tenant) throw new Error("会社コードが正しくありません");
  if (tenant.status !== "active") throw new Error("このテナントは利用できません");

  return tenant;
}
