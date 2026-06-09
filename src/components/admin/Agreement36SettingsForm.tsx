"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import {
  currentFiscalYear,
  DEFAULT_AGREEMENT_36_FISCAL,
  DEFAULT_AGREEMENT_36_GLOBAL,
  fiscalYearOptions,
} from "@/lib/employment/agreement-36-defaults";
import { daysInMonth, MONTH_OPTIONS } from "@/lib/staff/constants";
import type {
  Agreement36Fiscal,
  Agreement36FiscalInput,
  Agreement36Global,
  Agreement36GlobalInput,
  Agreement36Version,
  TenantStaff,
} from "@/lib/types";
import { api } from "@/lib/utils";
import { cn } from "@/lib/utils";

type SettingsResponse = {
  global: Agreement36Global;
  fiscal: Agreement36Fiscal;
};

function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex w-full max-w-xl overflow-hidden rounded-xl border border-surface-border">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 px-4 py-2.5 text-caption font-medium transition-colors",
            value === opt.value
              ? "bg-brand-600 text-white"
              : "bg-white text-apple-glyph hover:bg-slate-50"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function fiscalToInput(fiscal: Agreement36Fiscal): Agreement36FiscalInput {
  const {
    id: _id,
    tenantId: _tenantId,
    updatedAt: _updatedAt,
    ...input
  } = fiscal;
  return input;
}

function globalToInput(global: Agreement36Global): Agreement36GlobalInput {
  const {
    id: _id,
    tenantId: _tenantId,
    updatedAt: _updatedAt,
    ...input
  } = global;
  return input;
}

function AlertRow({
  label,
  enabled,
  hours,
  unit,
  onEnabledChange,
  onHoursChange,
}: {
  label: string;
  enabled: boolean;
  hours: number;
  unit: string;
  onEnabledChange: (value: boolean) => void;
  onHoursChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-wrap items-center gap-3 rounded-xl border border-surface-border px-4 py-3">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onEnabledChange(e.target.checked)}
        className="h-4 w-4"
      />
      <span className="min-w-0 flex-1 text-caption text-apple-text">{label}</span>
      <Input
        type="number"
        min={0}
        value={hours}
        onChange={(e) => onHoursChange(Number(e.target.value))}
        className="w-24"
        disabled={!enabled}
      />
      <span className="text-caption text-apple-glyph">{unit}</span>
    </label>
  );
}

export function Agreement36SettingsForm() {
  const initialYear = currentFiscalYear();
  const [fiscalYear, setFiscalYear] = useState(initialYear);
  const [globalForm, setGlobalForm] = useState<Agreement36GlobalInput>(
    DEFAULT_AGREEMENT_36_GLOBAL
  );
  const [fiscalForm, setFiscalForm] = useState<Agreement36FiscalInput>({
    ...DEFAULT_AGREEMENT_36_FISCAL,
    fiscalYear: initialYear,
  });
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);

  const { data, isLoading, mutate } = useApi<SettingsResponse>(
    `/api/admin/settings?section=employment_agreement_36&fiscalYear=${fiscalYear}`
  );
  const { data: staffData } = useApi<{ staff: TenantStaff[] }>(
    globalForm.isEnabled ? "/api/admin/settings?section=staff" : null
  );

  const yearOptions = useMemo(
    () => fiscalYearOptions(currentFiscalYear(globalForm.startMonth)),
    [globalForm.startMonth]
  );
  const dayOptions = useMemo(
    () =>
      Array.from(
        { length: daysInMonth(2024, globalForm.startMonth) },
        (_, i) => i + 1
      ),
    [globalForm.startMonth]
  );

  useEffect(() => {
    if (!data) return;
    setGlobalForm(globalToInput(data.global));
    setFiscalForm(fiscalToInput(data.fiscal));
  }, [data]);

  function patchGlobal(partial: Partial<Agreement36GlobalInput>) {
    setGlobalForm((prev) => ({ ...prev, ...partial }));
  }

  function patchFiscal(partial: Partial<Agreement36FiscalInput>) {
    setFiscalForm((prev) => ({ ...prev, ...partial }));
  }

  async function handleSave() {
    if (globalForm.isEnabled) {
      if (fiscalForm.specialMonthlyHours <= 0) {
        alert("1か月の特別条項延長時間を入力してください");
        return;
      }
      if (fiscalForm.specialExceedCount <= 0) {
        alert("限度超過労働可能回数を入力してください");
        return;
      }
      if (fiscalForm.specialYearlyHours <= 0) {
        alert("1年の特別条項延長時間を入力してください");
        return;
      }
    }

    setSaving(true);
    try {
      await api.patch("/api/admin/settings", {
        section: "employment_agreement_36",
        global: globalForm,
        fiscal: { ...fiscalForm, fiscalYear },
      });
      await mutate();
      alert("36協定設定を保存しました");
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyPreviousYear() {
    setCopying(true);
    try {
      const result = await api.patch<{ fiscal: Agreement36Fiscal }>(
        "/api/admin/settings",
        {
          section: "employment_agreement_36_copy",
          fiscalYear,
        }
      );
      setFiscalForm(fiscalToInput(result.fiscal));
      await mutate();
      alert(`${fiscalYear - 1}年度の設定をコピーしました`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "コピーに失敗しました");
    } finally {
      setCopying(false);
    }
  }

  if (isLoading && !data) {
    return <TableSkeleton rows={6} cols={2} />;
  }

  return (
    <div className="space-y-6">
      <p className="text-caption text-apple-glyph">
        法定外労働を管理し、基準に達した労働があった場合アラートを出すことができます。
      </p>

      <div className="rounded-xl border border-surface-border bg-slate-50/60 p-4">
        <div className="space-y-1.5">
          <span className="text-caption font-medium text-apple-text">
            起算日 <span className="text-rose-600">（必須）</span>
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={globalForm.startMonth}
              onChange={(e) =>
                patchGlobal({ startMonth: Number(e.target.value) })
              }
              className="focus-apple rounded-xl border border-surface-border bg-white px-3 py-2.5 text-body"
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}月
                </option>
              ))}
            </select>
            <select
              value={globalForm.startDay}
              onChange={(e) => patchGlobal({ startDay: Number(e.target.value) })}
              className="focus-apple rounded-xl border border-surface-border bg-white px-3 py-2.5 text-body"
            >
              {dayOptions.map((d) => (
                <option key={d} value={d}>
                  {d}日
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <SegmentedToggle
        value={globalForm.isEnabled ? "enabled" : "disabled"}
        options={[
          { value: "disabled", label: "36協定機能を使用しない" },
          { value: "enabled", label: "36協定機能を使用する" },
        ]}
        onChange={(value) => patchGlobal({ isEnabled: value === "enabled" })}
      />

      {globalForm.isEnabled && (
        <div className="space-y-6 border-t border-surface-border pt-6">
          <div>
            <p className="mb-3 text-body font-medium text-apple-text">全従業員用</p>
            <SegmentedToggle
              value={globalForm.agreementVersion}
              options={[
                { value: "new", label: "新36協定機能を使用する" },
                { value: "old", label: "旧36協定機能を使用する" },
              ]}
              onChange={(value) =>
                patchGlobal({ agreementVersion: value as Agreement36Version })
              }
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="block space-y-1.5">
              <span className="text-caption font-medium text-apple-text">
                表示年度
              </span>
              <select
                value={fiscalYear}
                onChange={(e) => setFiscalYear(Number(e.target.value))}
                className="focus-apple rounded-xl border border-surface-border bg-white px-3 py-2.5 text-body"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}年度
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              variant="secondary"
              disabled={copying}
              onClick={handleCopyPreviousYear}
            >
              {copying ? "コピー中…" : "直前年度の設定をコピー"}
            </Button>
          </div>

          <p className="text-caption text-apple-glyph">
            ※ 以下の設定は全ての従業員に適用されます。
          </p>

          <div className="rounded-xl border border-surface-border p-4">
            <p className="mb-4 text-body font-medium text-apple-text">
              36協定（特別条項）
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="1日 特別条項で延長することができる時間数"
                type="number"
                min={0}
                value={fiscalForm.specialDailyHours}
                onChange={(e) =>
                  patchFiscal({ specialDailyHours: Number(e.target.value) })
                }
                hint="時間"
              />
              <Input
                label="1か月 特別条項で延長することができる時間数（必須）"
                type="number"
                min={1}
                value={fiscalForm.specialMonthlyHours}
                onChange={(e) =>
                  patchFiscal({ specialMonthlyHours: Number(e.target.value) })
                }
                hint="時間"
              />
              <Input
                label="特別条項で限度時間を超えて労働させることができる回数（必須）"
                type="number"
                min={1}
                value={fiscalForm.specialExceedCount}
                onChange={(e) =>
                  patchFiscal({ specialExceedCount: Number(e.target.value) })
                }
                hint="回"
              />
              <Input
                label="1年 特別条項で延長することができる時間数（必須）"
                type="number"
                min={1}
                value={fiscalForm.specialYearlyHours}
                onChange={(e) =>
                  patchFiscal({ specialYearlyHours: Number(e.target.value) })
                }
                hint="時間"
              />
            </div>
          </div>

          <div className="rounded-xl border border-surface-border p-4">
            <p className="mb-1 text-body font-medium text-apple-text">
              36協定アラート通知条件設定
            </p>
            <p className="mb-4 text-caption text-apple-glyph">
              アラートは基準を超えた翌日の午前0時頃送られます
            </p>
            <div className="space-y-2">
              <AlertRow
                label="1日の法定外労働が、所定の時間に達した場合に通知する"
                enabled={fiscalForm.alertDailyEnabled}
                hours={fiscalForm.alertDailyHours}
                unit="時間"
                onEnabledChange={(v) => patchFiscal({ alertDailyEnabled: v })}
                onHoursChange={(v) => patchFiscal({ alertDailyHours: v })}
              />
              <AlertRow
                label="1週の法定外労働及び休日労働が、所定の時間に達した場合に通知する"
                enabled={fiscalForm.alertWeeklyEnabled}
                hours={fiscalForm.alertWeeklyHours}
                unit="時間"
                onEnabledChange={(v) => patchFiscal({ alertWeeklyEnabled: v })}
                onHoursChange={(v) => patchFiscal({ alertWeeklyHours: v })}
              />
              <AlertRow
                label="1か月の法定外労働及び休日労働が、所定の時間に達した場合に通知する"
                enabled={fiscalForm.alertMonthlyEnabled}
                hours={fiscalForm.alertMonthlyHours}
                unit="時間"
                onEnabledChange={(v) => patchFiscal({ alertMonthlyEnabled: v })}
                onHoursChange={(v) => patchFiscal({ alertMonthlyHours: v })}
              />
              <AlertRow
                label="2～6か月の法定外労働及び休日労働の平均が、所定の時間に達した場合に通知する"
                enabled={fiscalForm.alertAvg26Enabled}
                hours={fiscalForm.alertAvg26Hours}
                unit="時間"
                onEnabledChange={(v) => patchFiscal({ alertAvg26Enabled: v })}
                onHoursChange={(v) => patchFiscal({ alertAvg26Hours: v })}
              />
              <AlertRow
                label="1年の法定外労働が、所定の時間に達した場合に通知する"
                enabled={fiscalForm.alertYearlyEnabled}
                hours={fiscalForm.alertYearlyHours}
                unit="時間"
                onEnabledChange={(v) => patchFiscal({ alertYearlyEnabled: v })}
                onHoursChange={(v) => patchFiscal({ alertYearlyHours: v })}
              />
              <AlertRow
                label="限度時間を超えて労働させた回数が、所定の回数に達した場合に通知する"
                enabled={fiscalForm.alertExceedCountEnabled}
                hours={fiscalForm.alertExceedCount}
                unit="回"
                onEnabledChange={(v) =>
                  patchFiscal({ alertExceedCountEnabled: v })
                }
                onHoursChange={(v) => patchFiscal({ alertExceedCount: v })}
              />
            </div>
          </div>

          <div className="rounded-xl border border-surface-border p-4">
            <p className="mb-4 text-body font-medium text-apple-text">
              36協定アラート通知先設定
            </p>
            <div className="space-y-4">
              <div className="space-y-3">
                <p className="text-caption font-medium text-apple-glyph">メール通知</p>
                <label className="flex items-center gap-3 text-caption text-apple-text">
                  <input
                    type="checkbox"
                    checked={fiscalForm.notifyEmployee}
                    onChange={(e) =>
                      patchFiscal({ notifyEmployee: e.target.checked })
                    }
                  />
                  従業員にメール通知
                </label>
                <label className="flex items-center gap-3 text-caption text-apple-text">
                  <input
                    type="checkbox"
                    checked={fiscalForm.notifyAdmin}
                    onChange={(e) =>
                      patchFiscal({ notifyAdmin: e.target.checked })
                    }
                  />
                  管理者にメール通知
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-3 text-caption text-apple-text">
                    <input
                      type="checkbox"
                      checked={fiscalForm.notifyCustom}
                      onChange={(e) =>
                        patchFiscal({ notifyCustom: e.target.checked })
                      }
                    />
                    カスタマイズメール通知
                  </label>
                  <select
                    value={fiscalForm.notifyCustomUserId ?? ""}
                    disabled={!fiscalForm.notifyCustom}
                    onChange={(e) =>
                      patchFiscal({
                        notifyCustomUserId: e.target.value || null,
                      })
                    }
                    className="focus-apple min-w-[12rem] rounded-xl border border-surface-border bg-white px-3 py-2 text-caption"
                  >
                    <option value="">スタッフを選択</option>
                    {(staffData?.staff ?? []).map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="メールアドレス"
                    value={fiscalForm.notifyCustomEmail}
                    disabled={!fiscalForm.notifyCustom}
                    onChange={(e) =>
                      patchFiscal({ notifyCustomEmail: e.target.value })
                    }
                    className="min-w-[16rem] flex-1"
                  />
                </div>
              </div>

              <div className="space-y-3 border-t border-surface-border pt-4">
                <p className="text-caption font-medium text-apple-glyph">LINE通知</p>
                <label className="flex items-center gap-3 text-caption text-apple-text">
                  <input
                    type="checkbox"
                    checked={fiscalForm.notifyEmployeeLine}
                    onChange={(e) =>
                      patchFiscal({ notifyEmployeeLine: e.target.checked })
                    }
                  />
                  従業員にLINE通知
                </label>
                <label className="flex items-center gap-3 text-caption text-apple-text">
                  <input
                    type="checkbox"
                    checked={fiscalForm.notifyAdminLine}
                    onChange={(e) =>
                      patchFiscal({ notifyAdminLine: e.target.checked })
                    }
                  />
                  管理者にLINE通知
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-3 text-caption text-apple-text">
                    <input
                      type="checkbox"
                      checked={fiscalForm.notifyCustomLine}
                      onChange={(e) =>
                        patchFiscal({ notifyCustomLine: e.target.checked })
                      }
                    />
                    カスタマイズLINE通知
                  </label>
                  <select
                    value={fiscalForm.notifyCustomLineUserId ?? ""}
                    disabled={!fiscalForm.notifyCustomLine}
                    onChange={(e) =>
                      patchFiscal({
                        notifyCustomLineUserId: e.target.value || null,
                      })
                    }
                    className="focus-apple min-w-[12rem] rounded-xl border border-surface-border bg-white px-3 py-2 text-caption"
                  >
                    <option value="">スタッフを選択</option>
                    {(staffData?.staff ?? []).map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name}
                        {staff.lineUserId ? "" : "（LINE未連携）"}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-caption text-apple-glyph">
                  LINE通知はスタッフのLINE連携（line_user_id）が登録されている場合に送信されます。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-surface-border pt-4">
        <Button disabled={saving} onClick={handleSave}>
          {saving ? "保存中…" : "保存"}
        </Button>
      </div>
    </div>
  );
}
