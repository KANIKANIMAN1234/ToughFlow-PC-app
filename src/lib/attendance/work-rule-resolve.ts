import { DEFAULT_EMPLOYMENT_WORK_RULE } from "@/lib/employment/work-rule-defaults";
import type { EmploymentWorkRule, StaffType } from "@/lib/types";

function defaultRule(): EmploymentWorkRule {
  return {
    id: "default",
    tenantId: "",
    updatedAt: "",
    ...DEFAULT_EMPLOYMENT_WORK_RULE,
  };
}

/** 所属グループ・スタッフ種別に最も近い就業ルールを返す */
export function resolveWorkRuleForStaff(
  rules: EmploymentWorkRule[],
  staffType: StaffType,
  groupKey = ""
): EmploymentWorkRule {
  const find = (gk: string, st: StaffType | null) =>
    rules.find((r) => r.groupKey === gk && r.staffType === st);

  return (
    find(groupKey, staffType) ??
    find(groupKey, null) ??
    find("", staffType) ??
    find("", null) ??
    rules[0] ??
    defaultRule()
  );
}
