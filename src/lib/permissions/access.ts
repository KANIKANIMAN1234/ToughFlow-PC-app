import type { AccessLevel } from "@/lib/types";

/** allow / conditional はアクセス可（conditional のスコープ制限は repository 層で実施） */
export function isAccessGranted(level: AccessLevel): boolean {
  return level === "allow" || level === "conditional";
}
