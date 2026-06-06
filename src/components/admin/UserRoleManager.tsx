"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import { ROLE_LABELS, ROLES } from "@/lib/permissions/defaults";
import { api } from "@/lib/utils";
import type { TenantUser, UserRole } from "@/lib/types";

export function UserRoleManager() {
  const { data, isLoading, mutate } = useApi<{ users: TenantUser[] }>(
    "/api/admin/settings?section=users"
  );
  const [roles, setRoles] = useState<Record<string, UserRole>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const users = data?.users ?? [];

  useEffect(() => {
    if (!data?.users) return;
    const next: Record<string, UserRole> = {};
    for (const user of data.users) {
      next[user.id] = user.role;
    }
    setRoles(next);
  }, [data?.users]);

  async function saveRole(userId: string, name: string) {
    const role = roles[userId];
    if (!role) return;
    if (!confirm(`${name} の役職を「${ROLE_LABELS[role]}」に変更しますか？`)) return;

    setSavingId(userId);
    try {
      await api.patch("/api/admin/settings", {
        section: "user_role",
        userId,
        role,
      });
      await mutate();
    } catch (e) {
      alert(e instanceof Error ? e.message : "役職の更新に失敗しました");
    } finally {
      setSavingId(null);
    }
  }

  if (isLoading) return <TableSkeleton rows={5} cols={4} />;

  return (
    <Card title="ユーザー管理">
      <p className="mb-4 text-caption text-apple-glyph">
        LINEログインで自動作成されたユーザーの役職を設定します。初回ログイン時は「現場」が付与されます。
      </p>

      {users.length === 0 ? (
        <p className="text-caption text-apple-glyph">ユーザーが登録されていません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-caption">
            <thead>
              <tr className="border-b border-surface-border text-apple-glyph">
                <th className="px-3 py-2 font-normal">氏名</th>
                <th className="px-3 py-2 font-normal">LINE連携</th>
                <th className="px-3 py-2 font-normal">役職</th>
                <th className="px-3 py-2 font-normal" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-surface-border/60">
                  <td className="px-3 py-3 text-apple-text">{user.name}</td>
                  <td className="px-3 py-3 text-apple-glyph">
                    {user.lineUserId ? "済" : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <select
                      className="focus-apple rounded-lg border border-surface-border bg-white px-2 py-1.5 text-caption"
                      value={roles[user.id] ?? user.role}
                      onChange={(e) =>
                        setRoles((prev) => ({
                          ...prev,
                          [user.id]: e.target.value as UserRole,
                        }))
                      }
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Button
                      variant="secondary"
                      disabled={
                        savingId === user.id ||
                        (roles[user.id] ?? user.role) === user.role
                      }
                      onClick={() => saveRole(user.id, user.name)}
                    >
                      {savingId === user.id ? "保存中…" : "保存"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
