"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/utils";
import type { FolderSettings } from "@/lib/types";

export function FolderDesignPanel() {
  const { data, isLoading, mutate } = useApi<{ folder: FolderSettings }>(
    "/api/admin/settings?section=folder"
  );
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FolderSettings | null>(null);

  const folder = form ?? data?.folder;

  if (isLoading && !folder) {
    return <TableSkeleton rows={4} cols={2} />;
  }

  if (!folder) return null;

  async function handleSave() {
    if (!folder) return;
    setSaving(true);
    try {
      await api.patch("/api/admin/settings", { section: "folder", folder });
      await mutate();
      alert("フォルダ設計を保存しました");
    } finally {
      setSaving(false);
    }
  }

  function update(patch: Partial<FolderSettings>) {
    setForm({ ...folder!, ...patch });
  }

  return (
    <div className="space-y-6">
      <Card title="Google Drive 保存先">
        <div className="grid max-w-2xl gap-4">
          <Input
            label="保存先ルートフォルダ ID"
            value={folder.driveRootFolderId}
            onChange={(e) => update({ driveRootFolderId: e.target.value })}
            placeholder="Google Drive フォルダ ID"
          />
          <Input
            label="処理済みメールフォルダ ID"
            value={folder.mailProcessedFolderId}
            onChange={(e) => update({ mailProcessedFolderId: e.target.value })}
            placeholder="_処理済みメール フォルダ ID"
          />
        </div>
      </Card>

      <Card title="フォルダテンプレート">
        <div className="grid max-w-2xl gap-4">
          <Input
            label="プロジェクトフォルダ命名規則"
            value={folder.projectNamePattern}
            onChange={(e) => update({ projectNamePattern: e.target.value })}
            placeholder="{date}_{name}"
          />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-apple-text">
              プロジェクト配下サブフォルダ（改行区切り）
            </span>
            <textarea
              className="w-full rounded-xl border border-surface-border px-3 py-2 text-caption"
              rows={8}
              value={folder.subfolderNames.join("\n")}
              onChange={(e) =>
                update({
                  subfolderNames: e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
        </div>
      </Card>

      <Card title="階層プレビュー">
        <pre className="rounded-card bg-apple-section p-4 text-caption text-apple-glyph">
{`{保存先ルート}/
├── {顧客名}/
│   └── {プロジェクト名}/  ← ${folder.projectNamePattern}
${folder.subfolderNames.map((s) => `│       ├── ${s}/`).join("\n")}
└── _処理済みメール/`}
        </pre>
      </Card>

      <Button disabled={saving} onClick={() => void handleSave()}>
        {saving ? "保存中…" : "保存"}
      </Button>
    </div>
  );
}
