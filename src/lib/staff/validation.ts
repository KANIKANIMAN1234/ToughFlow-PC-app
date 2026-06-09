import type { StaffInput } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\d+$/;
const STAFF_CODE_RE = /^[a-zA-Z0-9]+$/;
const PASSWORD_RE = /^[a-zA-Z0-9]+$/;

export function buildStaffName(lastName: string, firstName: string): string {
  return `${lastName.trim()}${firstName.trim() ? ` ${firstName.trim()}` : ""}`.trim();
}

export function validateStaffInput(
  input: StaffInput,
  options: { requirePassword?: boolean } = {}
): string | null {
  if (!input.lastName.trim()) return "姓を入力してください";
  if (!input.firstName.trim()) return "名を入力してください";

  if (input.email?.trim() && !EMAIL_RE.test(input.email.trim())) {
    return "メールアドレスの形式が正しくありません";
  }

  if (input.phone?.trim() && !PHONE_RE.test(input.phone.trim())) {
    return "電話番号は半角数字のみ（ハイフンなし）で入力してください";
  }

  if (input.staffCode?.trim()) {
    if (input.staffCode.length > 50) return "スタッフコードは50文字以内です";
    if (!STAFF_CODE_RE.test(input.staffCode)) {
      return "スタッフコードは半角英数字のみです";
    }
  }

  if (options.requirePassword) {
    if (!input.password?.trim()) return "パスワードを入力してください";
    if (input.password.length < 8) return "パスワードは8文字以上です";
    if (!PASSWORD_RE.test(input.password)) {
      return "パスワードは半角英数字のみです";
    }
  } else if (input.password?.trim()) {
    if (input.password.length < 8) return "パスワードは8文字以上です";
    if (!PASSWORD_RE.test(input.password)) {
      return "パスワードは半角英数字のみです";
    }
  }

  for (const [label, value] of [
    ["スタッフ備考1", input.remark1],
    ["スタッフ備考2", input.remark2],
    ["スタッフ備考3", input.remark3],
  ] as const) {
    if (value && value.length > 64) return `${label}は64文字以内です`;
  }

  if (input.hourlyWage != null && input.hourlyWage < 0) {
    return "時給は0以上で入力してください";
  }

  if (
    input.transportationAllowance != null &&
    input.transportationAllowance < 0
  ) {
    return "交通費は0以上で入力してください";
  }

  return null;
}
