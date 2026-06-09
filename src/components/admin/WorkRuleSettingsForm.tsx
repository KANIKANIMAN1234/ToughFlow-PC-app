"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useApi } from "@/hooks/useApi";
import { DEFAULT_EMPLOYMENT_WORK_RULE } from "@/lib/employment/work-rule-defaults";
import {
  GROUP_OPTIONS,
  overtimeCalcTypeOptions,
  SCHEDULED_CALC_OPTIONS,
  workRuleScopeLabel,
} from "@/lib/employment/work-rule-labels";
import { STAFF_TYPE_OPTIONS } from "@/lib/staff/constants";
import type {
  EmploymentOvertimeCalcTypeMaster,
  EmploymentWorkRule,
  EmploymentWorkRuleInput,
  StaffType,
} from "@/lib/types";
import { api } from "@/lib/utils";

const HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => i);
const EXTENDED_HOUR_OPTIONS = Array.from({ length: 30 }, (_, i) => i);
const MINUTE_OPTIONS = [0, 15, 30, 45];

function HourMinuteSelect({
  hours,
  minutes,
  hourOptions,
  onChange,
}: {
  hours: number;
  minutes: number;
  hourOptions?: number[];
  onChange: (hours: number, minutes: number) => void;
}) {
  const hourList = hourOptions ?? HOUR_OPTIONS;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <select
        value={hours}
        onChange={(e) => onChange(Number(e.target.value), minutes)}
        className="focus-apple rounded-lg border border-surface-border px-2 py-1 text-caption"
      >
        {hourList.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-caption text-apple-glyph">時間</span>
      <select
        value={minutes}
        onChange={(e) => onChange(hours, Number(e.target.value))}
        className="focus-apple rounded-lg border border-surface-border px-2 py-1 text-caption"
      >
        {MINUTE_OPTIONS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <span className="text-caption text-apple-glyph">分</span>
    </span>
  );
}

function ruleToInput(rule: EmploymentWorkRule): EmploymentWorkRuleInput {
  const { id: _id, tenantId: _tenantId, updatedAt: _updatedAt, ...input } = rule;
  return input;
}

export function WorkRuleSettingsForm() {
  const { data, isLoading, mutate } = useApi<{ rules: EmploymentWorkRule[] }>(
    "/api/admin/settings?section=employment_work_rules"
  );
  const { data: overtimeCalcData, isLoading: overtimeCalcLoading } = useApi<{
    overtimeCalcTypes: EmploymentOvertimeCalcTypeMaster[];
  }>("/api/admin/settings?section=employment_overtime_calc_types");

  const rules = data?.rules ?? [];
  const overtimeCalcTypes = overtimeCalcData?.overtimeCalcTypes ?? [];
  const overtimeCalcOptions = useMemo(
    () => overtimeCalcTypeOptions(overtimeCalcTypes),
    [overtimeCalcTypes]
  );
  const [filterGroup, setFilterGroup] = useState("");
  const [filterStaffType, setFilterStaffType] = useState<StaffType | "">("");
  const [selectedRuleId, setSelectedRuleId] = useState<string>("");
  const [form, setForm] = useState<EmploymentWorkRuleInput>(
    DEFAULT_EMPLOYMENT_WORK_RULE
  );
  const [saving, setSaving] = useState(false);

  const scopeOptions = useMemo(
    () =>
      rules.map((rule) => ({
        id: rule.id,
        label: workRuleScopeLabel(rule.groupKey, rule.staffType),
      })),
    [rules]
  );

  useEffect(() => {
    if (!rules.length) return;
    if (!selectedRuleId) {
      const defaultRule =
        rules.find((r) => r.groupKey === "" && !r.staffType) ?? rules[0];
      setSelectedRuleId(defaultRule.id);
      setForm(ruleToInput(defaultRule));
    }
  }, [rules, selectedRuleId]);

  function patch(partial: Partial<EmploymentWorkRuleInput>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function applyFilters() {
    const matched =
      rules.find(
        (rule) =>
          rule.groupKey === filterGroup &&
          (filterStaffType
            ? rule.staffType === filterStaffType
            : rule.staffType == null)
      ) ?? null;

    if (matched) {
      setSelectedRuleId(matched.id);
      setForm(ruleToInput(matched));
      return;
    }

    setSelectedRuleId("");
    setForm({
      ...DEFAULT_EMPLOYMENT_WORK_RULE,
      groupKey: filterGroup,
      staffType: filterStaffType || null,
    });
  }

  function selectExistingRule(ruleId: string) {
    const rule = rules.find((item) => item.id === ruleId);
    if (!rule) return;
    setSelectedRuleId(rule.id);
    setFilterGroup(rule.groupKey);
    setFilterStaffType(rule.staffType ?? "");
    setForm(ruleToInput(rule));
  }

  function resetToDefault() {
    setForm({
      ...DEFAULT_EMPLOYMENT_WORK_RULE,
      groupKey: form.groupKey,
      staffType: form.staffType,
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await api.patch<{ rule: EmploymentWorkRule }>(
        "/api/admin/settings",
        {
          section: "employment_work_rule",
          ruleId: selectedRuleId || undefined,
          rule: form,
        }
      );
      setSelectedRuleId(result.rule.id);
      setForm(ruleToInput(result.rule));
      await mutate();
      alert("保存しました");
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || overtimeCalcLoading) {
    return <p className="text-caption text-apple-glyph">読み込み中…</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-caption text-apple-glyph">
        残業・深夜労働の割増率と時間を指定します。グループ・種別で設定がない場合は上位（全て）の設定が適用されます。
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-caption">
          <span className="text-apple-glyph">所属グループ</span>
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="block min-w-[8rem] rounded-lg border border-surface-border px-3 py-2 text-body"
          >
            {GROUP_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-caption">
          <span className="text-apple-glyph">スタッフ種別</span>
          <select
            value={filterStaffType}
            onChange={(e) =>
              setFilterStaffType(e.target.value as StaffType | "")
            }
            className="block min-w-[10rem] rounded-lg border border-surface-border px-3 py-2 text-body"
          >
            <option value="">全て</option>
            {STAFF_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <Button variant="secondary" onClick={applyFilters}>
          表示
        </Button>
        <label className="min-w-[12rem] flex-1 space-y-1 text-caption">
          <span className="text-apple-glyph">既存の設定一覧</span>
          <select
            value={selectedRuleId}
            onChange={(e) => selectExistingRule(e.target.value)}
            className="block w-full rounded-lg border border-surface-border px-3 py-2 text-body"
          >
            {scopeOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-card border border-surface-border">
        <table className="min-w-[960px] w-full text-caption">
          <tbody>
            <tr className="border-b border-surface-border">
              <td className="w-40 bg-apple-section px-4 py-4 align-top font-medium text-apple-text">
                所定労働時間
              </td>
              <td className="w-56 px-4 py-4 align-top">
                <div className="space-y-2">
                  <Button variant="secondary" onClick={resetToDefault}>
                    初期設定
                  </Button>
                  <select
                    value={form.scheduledCalcType}
                    onChange={(e) =>
                      patch({
                        scheduledCalcType:
                          e.target.value as EmploymentWorkRuleInput["scheduledCalcType"],
                      })
                    }
                    className="block w-full rounded-lg border border-surface-border px-2 py-1.5"
                  >
                    {SCHEDULED_CALC_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </td>
              <td className="px-4 py-4 align-top text-apple-text">
                <HourMinuteSelect
                  hours={form.scheduledLimitHours}
                  minutes={form.scheduledLimitMinutes}
                  onChange={(scheduledLimitHours, scheduledLimitMinutes) =>
                    patch({ scheduledLimitHours, scheduledLimitMinutes })
                  }
                />
                <span className="ml-2">以下の労働時間を所定労働時間とする。</span>
              </td>
            </tr>

            <tr className="border-b border-surface-border">
              <td className="bg-apple-section px-4 py-4 align-top font-medium text-apple-text">
                残業手当／時間
              </td>
              <td className="px-4 py-4 align-top">
                <div className="space-y-2">
                  <label className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      value={form.overtimeRatePercent}
                      onChange={(e) =>
                        patch({ overtimeRatePercent: Number(e.target.value) })
                      }
                      className="w-16 rounded-lg border border-surface-border px-2 py-1"
                    />
                    <span>%増し</span>
                  </label>
                  <Button variant="secondary" onClick={resetToDefault}>
                    初期設定
                  </Button>
                  <select
                    value={form.overtimeCalcType}
                    onChange={(e) =>
                      patch({
                        overtimeCalcType:
                          e.target.value as EmploymentWorkRuleInput["overtimeCalcType"],
                      })
                    }
                    className="block w-full rounded-lg border border-surface-border px-2 py-1.5"
                  >
                    {overtimeCalcOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </td>
              <td className="space-y-3 px-4 py-4 align-top text-apple-text">
                <p>
                  1日
                  <span className="mx-1 inline-block">
                    <HourMinuteSelect
                      hours={form.overtimeDayThresholdHours}
                      minutes={form.overtimeDayThresholdMinutes}
                      onChange={(
                        overtimeDayThresholdHours,
                        overtimeDayThresholdMinutes
                      ) =>
                        patch({
                          overtimeDayThresholdHours,
                          overtimeDayThresholdMinutes,
                        })
                      }
                    />
                  </span>
                  を超える日の週合計、または週
                  <span className="mx-1 inline-block">
                    <HourMinuteSelect
                      hours={form.overtimeWeekThresholdHours}
                      minutes={form.overtimeWeekThresholdMinutes}
                      onChange={(
                        overtimeWeekThresholdHours,
                        overtimeWeekThresholdMinutes
                      ) =>
                        patch({
                          overtimeWeekThresholdHours,
                          overtimeWeekThresholdMinutes,
                        })
                      }
                    />
                  </span>
                  を超える労働の多い方を残業とする。
                </p>
                <label className="flex flex-wrap items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.deemedOvertimeEnabled}
                    onChange={(e) =>
                      patch({ deemedOvertimeEnabled: e.target.checked })
                    }
                  />
                  <span>月あたり</span>
                  <HourMinuteSelect
                    hours={form.deemedOvertimeHours}
                    minutes={form.deemedOvertimeMinutes}
                    onChange={(deemedOvertimeHours, deemedOvertimeMinutes) =>
                      patch({ deemedOvertimeHours, deemedOvertimeMinutes })
                    }
                  />
                  <span>はみなし残業とする。</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.excludeStatutoryHolidays}
                    onChange={(e) =>
                      patch({ excludeStatutoryHolidays: e.target.checked })
                    }
                  />
                  <span>法定休日は残業計算しない</span>
                </label>
              </td>
            </tr>

            <tr>
              <td className="bg-apple-section px-4 py-4 align-top font-medium text-apple-text">
                深夜手当／時間
              </td>
              <td className="px-4 py-4 align-top">
                <div className="space-y-2">
                  <label className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      value={form.lateNightRatePercent}
                      onChange={(e) =>
                        patch({ lateNightRatePercent: Number(e.target.value) })
                      }
                      className="w-16 rounded-lg border border-surface-border px-2 py-1"
                    />
                    <span>%増し</span>
                  </label>
                  <Button variant="secondary" onClick={resetToDefault}>
                    初期設定
                  </Button>
                </div>
              </td>
              <td className="space-y-3 px-4 py-4 align-top text-apple-text">
                <p className="flex flex-wrap items-center gap-1">
                  <span>深夜対象：</span>
                  <HourMinuteSelect
                    hours={form.lateNightStartHour}
                    minutes={form.lateNightStartMinute}
                    hourOptions={HOUR_OPTIONS}
                    onChange={(lateNightStartHour, lateNightStartMinute) =>
                      patch({ lateNightStartHour, lateNightStartMinute })
                    }
                  />
                  <span>～</span>
                  <HourMinuteSelect
                    hours={form.lateNightEndHour}
                    minutes={form.lateNightEndMinute}
                    hourOptions={EXTENDED_HOUR_OPTIONS}
                    onChange={(lateNightEndHour, lateNightEndMinute) =>
                      patch({ lateNightEndHour, lateNightEndMinute })
                    }
                  />
                </p>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.includeEarlyMorningInLateNight}
                    onChange={(e) =>
                      patch({
                        includeEarlyMorningInLateNight: e.target.checked,
                      })
                    }
                  />
                  <span>
                    上記時間帯に該当する場合、早朝勤務も深夜労働に含む
                  </span>
                </label>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <Button disabled={saving} onClick={handleSave}>
          {saving ? "保存中…" : "保存"}
        </Button>
      </div>
    </div>
  );
}
