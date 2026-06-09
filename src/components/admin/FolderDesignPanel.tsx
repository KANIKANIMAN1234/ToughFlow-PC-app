"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import {
  buildFolderHierarchyPreview,
  buildFolderSettingsFields,
  DRIVE_DOCUMENT_TYPES,
  DRIVE_DOCUMENT_TYPE_LABELS,
  mergeDocumentFolderMap,
  remapDocumentFolderMapOnSubfolderChange,
  syncMappingsToSubfolders,
  type DriveDocumentType,
} from "@/lib/folder/document-folder-map";
import type { FolderSettings } from "@/lib/types";
import { api } from "@/lib/utils";

function normalizeFolder(raw: Partial<FolderSettings> | undefined): FolderSettings | null {
  if (!raw) return null;
  return buildFolderSettingsFields(raw);
}

function selectOptions(folder: FolderSettings, type: DriveDocumentType): string[] {
  const base =
    folder.subfolderNames.length > 0
      ? folder.subfolderNames
      : Object.values(folder.documentFolderMap);
  const current = folder.documentFolderMap[type];
  if (current && !base.includes(current)) {
    return [...base, current];
  }
  return base;
}

export function FolderDesignPanel() {
  const { data, isLoading, error, mutate } = useApi<{ folder: FolderSettings }>(
    "/api/admin/settings?section=folder"
  );
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FolderSettings | null>(null);

  const folder = form ?? normalizeFolder(data?.folder);

  if (isLoading && !folder) {
    return <TableSkeleton rows={4} cols={2} />;
  }

  if (error) {
    return (
      <Card title="フォルダ設計">
        <p className="text-caption text-red-600">
          設定の取得に失敗しました: {error.message}
        </p>
        <Button className="mt-4" onClick={() => void mutate()}>
          再読み込み
        </Button>
      </Card>
    );
  }

  if (!folder) {
    return (
      <Card title="フォルダ設計">
        <p className="text-caption text-apple-glyph">
          フォルダ設定を読み込めませんでした。
        </p>
        <Button className="mt-4" onClick={() => void mutate()}>
          再読み込み
        </Button>
      </Card>
    );
  }

  async function handleSave() {
    if (!folder) return;
    setSaving(true);
    try {
      await api.patch("/api/admin/settings", { section: "folder", folder });
      await mutate();
      setForm(null);
      alert("フォルダ設計を保存しました");
    } finally {
      setSaving(false);
    }
  }

  function update(patch: Partial<FolderSettings>) {
    const current = folder!;
    const nextSubfolders = patch.subfolderNames ?? current.subfolderNames;
    let nextMap = patch.documentFolderMap ?? current.documentFolderMap;

    if (patch.subfolderNames) {
      nextMap = remapDocumentFolderMapOnSubfolderChange(
        current.subfolderNames,
        nextSubfolders,
        nextMap
      );
    }

    const documentFolderMap = syncMappingsToSubfolders(
      nextSubfolders,
      mergeDocumentFolderMap(nextMap)
    );
    const base = buildFolderSettingsFields({
      ...current,
      ...patch,
      subfolderNames: nextSubfolders,
      documentFolderMap,
    });
    setForm(base);
  }

  function updateDocumentFolder(type: DriveDocumentType, folderName: string) {
    update({
      documentFolderMap: {
        ...folder!.documentFolderMap,
        [type]: folderName,
      },
    });
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

      <Card title="書類の保存先フォルダ">
        <p className="mb-4 text-caption text-apple-glyph">
          各書類がプロジェクト配下のどのサブフォルダに保存されるかを指定します。サブフォルダ名を変更した場合は、ここも合わせて更新してください。
        </p>
        <div className="grid max-w-2xl gap-3">
          {DRIVE_DOCUMENT_TYPES.map((type) => (
            <label key={type} className="grid grid-cols-[1fr_12rem] items-center gap-3">
              <span className="text-sm text-apple-text">
                {DRIVE_DOCUMENT_TYPE_LABELS[type]}
              </span>
              <select
                className="rounded-xl border border-surface-border px-3 py-2 text-caption"
                value={folder.documentFolderMap[type]}
                onChange={(e) => updateDocumentFolder(type, e.target.value)}
                disabled={selectOptions(folder, type).length === 0}
              >
                {selectOptions(folder, type).map((name) => (
                  <option key={`${type}-${name}`} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </Card>

      <Card title="階層プレビュー">
        <p className="mb-3 text-caption text-apple-glyph">
          サブフォルダ名・書類の保存先を変更すると、下記の構成図がリアルタイムで更新されます。
        </p>
        <pre className="rounded-card bg-apple-section p-4 text-caption text-apple-glyph">
          {buildFolderHierarchyPreview(folder)}
        </pre>
      </Card>

      <Button disabled={saving} onClick={() => void handleSave()}>
        {saving ? "保存中…" : "保存"}
      </Button>
    </div>
  );
}
