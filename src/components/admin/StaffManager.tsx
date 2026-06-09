"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import {
  EMPTY_STAFF_INPUT,
  StaffForm,
  staffToInput,
} from "@/components/admin/StaffForm";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS } from "@/lib/permissions/defaults";
import { STAFF_TYPE_OPTIONS } from "@/lib/staff/constants";
import type { StaffInput, TenantStaff } from "@/lib/types";
import { api } from "@/lib/utils";

type ViewMode = "list" | "create" | "edit";

function staffTypeLabel(value?: string) {
  return STAFF_TYPE_OPTIONS.find((opt) => opt.value === value)?.label ?? "—";
}

export function StaffManager() {
  const { user: currentUser } = useAuth();
  const { data, isLoading, mutate } = useApi<{ staff: TenantStaff[] }>(
    "/api/admin/settings?section=staff"
  );
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StaffInput>(EMPTY_STAFF_INPUT);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const staff = data?.staff ?? [];

  function openCreate() {
    setForm(EMPTY_STAFF_INPUT);
    setEditingId(null);
    setView("create");
  }

  function openEdit(member: TenantStaff) {
    setForm(staffToInput(member));
    setEditingId(member.id);
    setView("edit");
  }

  function backToList() {
    setView("list");
    setEditingId(null);
    setForm(EMPTY_STAFF_INPUT);
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      if (view === "create") {
        await api.post("/api/admin/settings", {
          section: "staff_create",
          staff: form,
        });
      } else if (view === "edit" && editingId) {
        await api.patch("/api/admin/settings", {
          section: "staff_update",
          userId: editingId,
          staff: form,
        });
      }
      await mutate();
      backToList();
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateStaff(member: TenantStaff) {
    if (
      !confirm(
        `${member.name} を削除しますか？\n\n論理削除のためデータは保持されますが、ログインできなくなります。`
      )
    ) {
      return;
    }

    setDeletingId(member.id);
    try {
      await api.patch("/api/admin/settings", {
        section: "user_deactivate",
        userId: member.id,
      });
      await mutate();
      if (editingId === member.id) backToList();
    } catch (e) {
      alert(e instanceof Error ? e.message : "削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) return <TableSkeleton rows={5} cols={6} />;

  if (view === "create" || view === "edit") {
    return (
      <Card title={view === "create" ? "スタッフ新規登録" : "スタッフ編集"}>
        <StaffForm
          mode={view}
          value={form}
          saving={saving}
          onChange={setForm}
          onSubmit={handleSubmit}
          onCancel={backToList}
        />
      </Card>
    );
  }

  return (
    <Card title="スタッフ管理">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-caption text-apple-glyph">
          スタッフの登録・編集を行います。LINEログインで自動作成されたスタッフもここで編集できます。削除は論理削除です。
        </p>
        <Button onClick={openCreate}>新規スタッフ追加</Button>
      </div>

      {staff.length === 0 ? (
        <p className="text-caption text-apple-glyph">
          スタッフが登録されていません。
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-caption">
            <thead>
              <tr className="border-b border-surface-border text-apple-glyph">
                <th className="px-3 py-2 font-normal">氏名</th>
                <th className="px-3 py-2 font-normal">スタッフコード</th>
                <th className="px-3 py-2 font-normal">種別</th>
                <th className="px-3 py-2 font-normal">役職</th>
                <th className="px-3 py-2 font-normal">LINE連携</th>
                <th className="px-3 py-2 font-normal" />
                <th className="px-3 py-2 font-normal" />
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => {
                const isSelf = currentUser?.id === member.id;
                return (
                  <tr
                    key={member.id}
                    className="border-b border-surface-border/60"
                  >
                    <td className="px-3 py-3 text-apple-text">
                      {member.name}
                      {isSelf && (
                        <span className="ml-2 text-apple-glyph">（自分）</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-apple-glyph">
                      {member.staffCode || "—"}
                    </td>
                    <td className="px-3 py-3 text-apple-glyph">
                      {staffTypeLabel(member.staffType)}
                    </td>
                    <td className="px-3 py-3 text-apple-glyph">
                      {ROLE_LABELS[member.role]}
                    </td>
                    <td className="px-3 py-3 text-apple-glyph">
                      {member.lineUserId ? "済" : "—"}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Button
                        variant="secondary"
                        onClick={() => openEdit(member)}
                      >
                        編集
                      </Button>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Button
                        variant="danger"
                        disabled={deletingId === member.id || isSelf}
                        onClick={() => deactivateStaff(member)}
                      >
                        {deletingId === member.id ? "削除中…" : "削除"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
