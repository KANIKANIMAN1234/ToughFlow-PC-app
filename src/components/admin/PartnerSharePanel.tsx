"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/utils";
import type {
  PartnerDefaultMethod,
  PartnerShareSettings,
  ShareNotifyMethod,
  TenantUser,
} from "@/lib/types";

const DEFAULT_METHODS: { value: PartnerDefaultMethod; label: string }[] = [
  { value: "email", label: "メール" },
  { value: "line", label: "LINE" },
  { value: "both", label: "メール＋LINE同時" },
];

const NOTIFY_METHODS: { value: ShareNotifyMethod; label: string }[] = [
  { value: "default", label: "テナント既定に従う" },
  { value: "email", label: "メール" },
  { value: "line", label: "LINE" },
  { value: "both", label: "メール＋LINE同時" },
];

export function PartnerSharePanel() {
  const { data, isLoading, mutate } = useApi<{ partner: PartnerShareSettings }>(
    "/api/admin/settings?section=partner"
  );
  const [defaultMethod, setDefaultMethod] =
    useState<PartnerDefaultMethod>("email");
  const [partners, setPartners] = useState<TenantUser[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.partner) {
      setDefaultMethod(data.partner.defaultMethod);
      setPartners(data.partner.partners);
    }
  }, [data]);

  if (isLoading && !data) {
    return <TableSkeleton rows={4} cols={3} />;
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch("/api/admin/settings", {
        section: "partner",
        defaultMethod,
        partners: partners.map((p) => ({
          userId: p.id,
          shareNotifyMethod: p.shareNotifyMethod ?? "default",
          email: p.email,
        })),
      });
      await mutate();
      alert("パートナー共有設定を保存しました");
    } finally {
      setSaving(false);
    }
  }

  function updatePartner(id: string, patch: Partial<TenantUser>) {
    setPartners((list) =>
      list.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  }

  return (
    <div className="space-y-6">
      <Card title="テナント既定の通知方式">
        <p className="mb-4 text-caption text-apple-glyph">
          パートナー企業の社内ポリシーに合わせて通知方式を選択してください。
        </p>
        <div className="flex flex-wrap gap-4">
          {DEFAULT_METHODS.map((m) => (
            <label key={m.value} className="flex items-center gap-2 text-caption">
              <input
                type="radio"
                name="defaultMethod"
                checked={defaultMethod === m.value}
                onChange={() => setDefaultMethod(m.value)}
              />
              {m.label}
            </label>
          ))}
        </div>
      </Card>

      <Card title="パートナー一覧">
        {partners.length === 0 ? (
          <p className="text-caption text-apple-glyph">
            role=partner のユーザーが登録されていません。
          </p>
        ) : (
          <div className="space-y-4">
            {partners.map((partner) => (
              <div
                key={partner.id}
                className="grid grid-cols-3 gap-4 rounded-card border border-surface-border p-4"
              >
                <div>
                  <p className="font-normal text-apple-text">{partner.name}</p>
                  <p className="text-nav-link text-apple-glyph">パートナー</p>
                </div>
                <label className="space-y-1">
                  <span className="text-xs text-apple-glyph">通知方式</span>
                  <select
                    className="w-full rounded-xl border border-surface-border px-3 py-2 text-caption"
                    value={partner.shareNotifyMethod ?? "default"}
                    onChange={(e) =>
                      updatePartner(partner.id, {
                        shareNotifyMethod: e.target.value as ShareNotifyMethod,
                      })
                    }
                  >
                    {NOTIFY_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  label="メールアドレス"
                  value={partner.email ?? ""}
                  onChange={(e) =>
                    updatePartner(partner.id, { email: e.target.value })
                  }
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Button disabled={saving} onClick={() => void handleSave()}>
        {saving ? "保存中…" : "保存"}
      </Button>
    </div>
  );
}
