"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ROLE_LABELS, ROLES } from "@/lib/permissions/defaults";
import {
  BIRTH_YEAR_OPTIONS,
  daysInMonth,
  JOIN_YEAR_OPTIONS,
  MONTH_OPTIONS,
  PRESCRIBED_WORK_DAYS_OPTIONS,
  STAFF_TYPE_OPTIONS,
  staffTypeUsesHourlyWage,
  WORK_HOUR_OPTIONS,
  WORK_MINUTE_OPTIONS,
} from "@/lib/staff/constants";
import type { StaffInput, TenantStaff } from "@/lib/types";
import { cn } from "@/lib/utils";

function parseDateParts(value?: string) {
  if (!value) return { year: "", month: "", day: "" };
  const [year, month, day] = value.split("-");
  return {
    year: year ?? "",
    month: month ? String(Number(month)) : "",
    day: day ? String(Number(day)) : "",
  };
}

function buildDateIso(year: string, month: string, day: string): string {
  if (!year || !month || !day) return "";
  const y = year.padStart(4, "0");
  const m = month.padStart(2, "0");
  const d = day.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function resolveYearOptions(base: number[], value?: string): number[] {
  const year = Number(parseDateParts(value).year);
  if (!year || base.includes(year)) return base;
  return [year, ...base].sort((a, b) => b - a);
}

function DatePartsField({
  label,
  value,
  onChange,
  yearOptions,
}: {
  label: string;
  value?: string;
  onChange: (iso: string) => void;
  yearOptions: number[];
}) {
  const parts = parseDateParts(value);
  const years = resolveYearOptions(yearOptions, value);
  const maxDay = daysInMonth(Number(parts.year), Number(parts.month));
  const dayOptions = Array.from({ length: maxDay }, (_, i) => i + 1);
  const selectClass =
    "focus-apple rounded-xl border border-surface-border bg-white px-3 py-2.5 text-body";

  function update(part: "year" | "month" | "day", next: string) {
    const merged = { ...parts, [part]: next };
    if (merged.year && merged.month && merged.day) {
      const limit = daysInMonth(Number(merged.year), Number(merged.month));
      if (Number(merged.day) > limit) {
        merged.day = String(limit);
      }
    }
    onChange(buildDateIso(merged.year, merged.month, merged.day));
  }

  return (
    <div className="space-y-1.5">
      <span className="text-caption font-medium text-apple-text">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={parts.year}
          onChange={(e) => update("year", e.target.value)}
          className={cn(selectClass, "w-28")}
          aria-label={`${label} 年`}
        >
          <option value="">—</option>
          {years.map((year) => (
            <option key={year} value={String(year)}>
              {year}
            </option>
          ))}
        </select>
        <span className="text-caption text-apple-glyph">年</span>
        <select
          value={parts.month}
          onChange={(e) => update("month", e.target.value)}
          className={cn(selectClass, "w-20")}
          aria-label={`${label} 月`}
        >
          <option value="">—</option>
          {MONTH_OPTIONS.map((month) => (
            <option key={month} value={String(month)}>
              {month}
            </option>
          ))}
        </select>
        <span className="text-caption text-apple-glyph">月</span>
        <select
          value={parts.day}
          onChange={(e) => update("day", e.target.value)}
          className={cn(selectClass, "w-20")}
          aria-label={`${label} 日`}
        >
          <option value="">—</option>
          {dayOptions.map((day) => (
            <option key={day} value={String(day)}>
              {day}
            </option>
          ))}
        </select>
        <span className="text-caption text-apple-glyph">日</span>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-caption font-medium text-apple-text">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="focus-apple w-full rounded-xl border border-surface-border bg-white px-3 py-2.5 text-body"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export const EMPTY_STAFF_INPUT: StaffInput = {
  lastName: "",
  firstName: "",
  email: "",
  phone: "",
  birthDate: "",
  staffCode: "",
  password: "",
  staffType: "unclassified",
  hourlyWage: null,
  prescribedWorkDaysType: "unset",
  prescribedWorkHours: 8,
  prescribedWorkMinutes: 0,
  transportationAllowance: null,
  joinDate: "",
  remark1: "",
  remark2: "",
  remark3: "",
  tags: "",
  role: "field",
};

export function staffToInput(staff: TenantStaff): StaffInput {
  return {
    lastName: staff.lastName ?? "",
    firstName: staff.firstName ?? "",
    email: staff.email ?? "",
    phone: staff.phone ?? "",
    birthDate: staff.birthDate ?? "",
    staffCode: staff.staffCode ?? "",
    password: "",
    staffType: staff.staffType ?? "unclassified",
    hourlyWage: staff.hourlyWage ?? null,
    prescribedWorkDaysType: staff.prescribedWorkDaysType ?? "unset",
    prescribedWorkHours: staff.prescribedWorkHours,
    prescribedWorkMinutes: staff.prescribedWorkMinutes,
    transportationAllowance: staff.transportationAllowance ?? null,
    joinDate: staff.joinDate ?? "",
    remark1: staff.remark1 ?? "",
    remark2: staff.remark2 ?? "",
    remark3: staff.remark3 ?? "",
    tags: staff.tags ?? "",
    role: staff.role,
  };
}

type Props = {
  mode: "create" | "edit";
  value: StaffInput;
  saving: boolean;
  onChange: (next: StaffInput) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export function StaffForm({
  mode,
  value,
  saving,
  onChange,
  onSubmit,
  onCancel,
}: Props) {
  function patch(partial: Partial<StaffInput>) {
    onChange({ ...value, ...partial });
  }

  const showHourlyWage = staffTypeUsesHourlyWage(value.staffType);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="姓"
              value={value.lastName}
              onChange={(e) => patch({ lastName: e.target.value })}
            />
            <Input
              label="名"
              value={value.firstName}
              onChange={(e) => patch({ firstName: e.target.value })}
            />
          </div>

          <Input
            label="メールアドレス"
            type="email"
            placeholder="email@example.com"
            value={value.email ?? ""}
            onChange={(e) => patch({ email: e.target.value })}
          />

          <Input
            label="電話番号"
            placeholder="半角数字 ハイフンなし"
            value={value.phone ?? ""}
            onChange={(e) => patch({ phone: e.target.value })}
          />

          <DatePartsField
            label="生年月日"
            value={value.birthDate}
            onChange={(birthDate) => patch({ birthDate })}
            yearOptions={BIRTH_YEAR_OPTIONS}
          />

          <Input
            label="スタッフコード"
            placeholder="半角英数 50文字まで"
            value={value.staffCode ?? ""}
            onChange={(e) => patch({ staffCode: e.target.value })}
          />

          <Input
            label="パスワード"
            type="password"
            placeholder={
              mode === "create"
                ? "半角英数 8文字以上"
                : "変更する場合のみ入力"
            }
            value={value.password ?? ""}
            onChange={(e) => patch({ password: e.target.value })}
            hint={
              mode === "edit"
                ? "空欄のままならパスワードは変更しません"
                : undefined
            }
          />

          <SelectField
            label="スタッフ種別"
            value={value.staffType}
            onChange={(staffType) => {
              const nextType = staffType as StaffInput["staffType"];
              patch({
                staffType: nextType,
                hourlyWage: staffTypeUsesHourlyWage(nextType)
                  ? value.hourlyWage
                  : null,
              });
            }}
            options={STAFF_TYPE_OPTIONS}
          />

          {showHourlyWage && (
            <Input
              label="時給"
              type="number"
              min={0}
              placeholder="半角数字"
              value={value.hourlyWage ?? ""}
              onChange={(e) =>
                patch({
                  hourlyWage: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          )}

          <SelectField
            label="所定労働日数区分（週 / 1年間）"
            value={value.prescribedWorkDaysType ?? "unset"}
            onChange={(prescribedWorkDaysType) =>
              patch({
                prescribedWorkDaysType:
                  prescribedWorkDaysType as StaffInput["prescribedWorkDaysType"],
              })
            }
            options={PRESCRIBED_WORK_DAYS_OPTIONS}
          />

          <div className="space-y-1.5">
            <span className="text-caption font-medium text-apple-text">
              所定労働時間（1日）
            </span>
            <div className="flex items-center gap-2">
              <select
                value={value.prescribedWorkHours}
                onChange={(e) =>
                  patch({ prescribedWorkHours: Number(e.target.value) })
                }
                className="focus-apple rounded-xl border border-surface-border px-3 py-2.5 text-body"
              >
                {WORK_HOUR_OPTIONS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <span className="text-caption text-apple-glyph">時間</span>
              <select
                value={value.prescribedWorkMinutes}
                onChange={(e) =>
                  patch({ prescribedWorkMinutes: Number(e.target.value) })
                }
                className="focus-apple rounded-xl border border-surface-border px-3 py-2.5 text-body"
              >
                {WORK_MINUTE_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <span className="text-caption text-apple-glyph">分</span>
            </div>
          </div>

          <Input
            label="交通費"
            type="number"
            min={0}
            placeholder="半角数字"
            value={value.transportationAllowance ?? ""}
            onChange={(e) =>
              patch({
                transportationAllowance: e.target.value
                  ? Number(e.target.value)
                  : null,
              })
            }
          />

          <DatePartsField
            label="入社日"
            value={value.joinDate}
            onChange={(joinDate) => patch({ joinDate })}
            yearOptions={JOIN_YEAR_OPTIONS}
          />

          <SelectField
            label="役職（権限ロール）"
            value={value.role}
            onChange={(role) => patch({ role: role as StaffInput["role"] })}
            options={ROLES.map((role) => ({
              value: role,
              label: ROLE_LABELS[role],
            }))}
          />
        </div>

        <div className="space-y-4">
          <Input
            label="スタッフ備考1"
            placeholder="64文字以内"
            value={value.remark1 ?? ""}
            onChange={(e) => patch({ remark1: e.target.value })}
          />
          <Input
            label="スタッフ備考2"
            placeholder="64文字以内"
            value={value.remark2 ?? ""}
            onChange={(e) => patch({ remark2: e.target.value })}
          />
          <Input
            label="スタッフ備考3"
            placeholder="64文字以内"
            value={value.remark3 ?? ""}
            onChange={(e) => patch({ remark3: e.target.value })}
          />
          <Input
            label="タグ（検索ワード）"
            placeholder="タグ"
            value={value.tags ?? ""}
            onChange={(e) => patch({ tags: e.target.value })}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-surface-border pt-4">
        <Button disabled={saving} onClick={onSubmit}>
          {saving ? "保存中…" : mode === "create" ? "登録" : "更新"}
        </Button>
        <Button variant="secondary" disabled={saving} onClick={onCancel}>
          一覧に戻る
        </Button>
      </div>
    </div>
  );
}
