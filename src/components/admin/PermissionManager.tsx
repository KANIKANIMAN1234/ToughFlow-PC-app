"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import {
  ACCESS_LABELS,
  ACCESS_LEVELS,
  ROLE_LABELS,
  ROLES,
} from "@/lib/permissions/defaults";
import { api } from "@/lib/utils";
import type { AccessLevel, PermissionDef, TenantUser, UserRole } from "@/lib/types";

type PermMode = "role" | "user";

export function PermissionManager() {
  const [mode, setMode] = useState<PermMode>("role");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [matrix, setMatrix] = useState<Record<string, Record<UserRole, AccessLevel>>>(
    {}
  );
  const [userOverrides, setUserOverrides] = useState<
    Record<string, AccessLevel | null>
  >({});
  const [saving, setSaving] = useState(false);

  const { data: roleData, isLoading: roleLoading, mutate: mutateRole } = useApi<{
    permissions: PermissionDef[];
    matrix: Record<string, Record<UserRole, AccessLevel>>;
  }>("/api/admin/settings?section=permissions");

  const { data: usersData } = useApi<{ users: TenantUser[] }>(
    "/api/admin/settings?section=users"
  );

  const { data: userData, isLoading: userLoading, mutate: mutateUser } = useApi<{
    permissions: PermissionDef[];
    roleMatrix: Record<string, Record<UserRole, AccessLevel>>;
    overrides: Record<string, AccessLevel | null>;
  }>(
    mode === "user" && selectedUserId
      ? `/api/admin/settings?section=permissions&userId=${selectedUserId}`
      : null
  );

  const permissions = roleData?.permissions ?? userData?.permissions ?? [];
  const users = usersData?.users ?? [];

  useEffect(() => {
    if (roleData?.matrix) setMatrix(roleData.matrix);
  }, [roleData]);

  useEffect(() => {
    const firstId = usersData?.users?.[0]?.id;
    if (!selectedUserId && firstId) {
      setSelectedUserId(firstId);
    }
  }, [usersData, selectedUserId]);

  useEffect(() => {
    if (userData?.overrides) setUserOverrides(userData.overrides);
  }, [userData]);

  async function saveRoleMatrix() {
    if (!confirm("ロール権限を保存しますか？")) return;
    setSaving(true);
    try {
      const updates = permissions.flatMap((perm) =>
        ROLES.map((role) => ({
          permissionId: perm.id,
          role,
          accessLevel: matrix[perm.id]?.[role] ?? "deny",
        }))
      );
      await api.patch("/api/admin/settings", {
        section: "role_permissions",
        updates,
      });
      await mutateRole();
      alert("ロール権限を保存しました");
    } finally {
      setSaving(false);
    }
  }

  async function saveUserOverrides() {
    if (!selectedUserId || !confirm("個人権限を保存しますか？")) return;
    setSaving(true);
    try {
      const updates = permissions.map((perm) => ({
        permissionId: perm.id,
        accessLevel: userOverrides[perm.id] ?? null,
      }));
      await api.patch("/api/admin/settings", {
        section: "user_permissions",
        userId: selectedUserId,
        updates,
      });
      await mutateUser();
      alert("個人権限を保存しました");
    } finally {
      setSaving(false);
    }
  }

  const loading =
    mode === "role" ? roleLoading && !roleData : userLoading && !userData;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("role")}
          className={`rounded-xl px-4 py-2 text-caption focus-apple ${
            mode === "role"
              ? "bg-brand-50 text-brand-600"
              : "text-apple-glyph hover:bg-apple-section"
          }`}
        >
          ロール別
        </button>
        <button
          type="button"
          onClick={() => setMode("user")}
          className={`rounded-xl px-4 py-2 text-caption focus-apple ${
            mode === "user"
              ? "bg-brand-50 text-brand-600"
              : "text-apple-glyph hover:bg-apple-section"
          }`}
        >
          ユーザー別
        </button>
      </div>

      {mode === "user" && (
        <Card title="ユーザー選択">
          <select
            className="w-full max-w-md rounded-xl border border-surface-border px-3 py-2 text-caption"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}（{ROLE_LABELS[u.role]}）
              </option>
            ))}
          </select>
        </Card>
      )}

      <Card
        title={mode === "role" ? "ロール別権限" : "ユーザー別権限上書き"}
        action={
          <Button
            size="sm"
            disabled={saving}
            onClick={() =>
              void (mode === "role" ? saveRoleMatrix() : saveUserOverrides())
            }
          >
            保存
          </Button>
        }
      >
        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-caption">
              <thead>
                <tr className="border-b border-surface-border text-left text-apple-glyph">
                  <th className="px-3 py-2">機能</th>
                  {mode === "role" ? (
                    ROLES.map((role) => (
                      <th key={role} className="px-3 py-2">
                        {ROLE_LABELS[role]}
                      </th>
                    ))
                  ) : (
                    <th className="px-3 py-2">権限</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {permissions.map((perm) => (
                  <tr
                    key={perm.id}
                    className="border-b border-surface-border/60"
                  >
                    <td className="px-3 py-2 font-normal text-apple-text">
                      {perm.name}
                    </td>
                    {mode === "role" ? (
                      ROLES.map((role) => (
                        <td key={role} className="px-3 py-2">
                          <select
                            className="w-full rounded-lg border border-surface-border px-2 py-1"
                            value={matrix[perm.id]?.[role] ?? "deny"}
                            onChange={(e) =>
                              setMatrix((m) => ({
                                ...m,
                                [perm.id]: {
                                  ...m[perm.id],
                                  [role]: e.target.value as AccessLevel,
                                },
                              }))
                            }
                          >
                            {ACCESS_LEVELS.map((level) => (
                              <option key={level} value={level}>
                                {ACCESS_LABELS[level]}
                              </option>
                            ))}
                          </select>
                        </td>
                      ))
                    ) : (
                      <td className="px-3 py-2">
                        <select
                          className="w-full max-w-xs rounded-lg border border-surface-border px-2 py-1"
                          value={userOverrides[perm.id] ?? ""}
                          onChange={(e) =>
                            setUserOverrides((o) => ({
                              ...o,
                              [perm.id]:
                                e.target.value === ""
                                  ? null
                                  : (e.target.value as AccessLevel),
                            }))
                          }
                        >
                          <option value="">未設定（ロールに従う）</option>
                          {ACCESS_LEVELS.map((level) => (
                            <option key={level} value={level}>
                              {ACCESS_LABELS[level]}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
