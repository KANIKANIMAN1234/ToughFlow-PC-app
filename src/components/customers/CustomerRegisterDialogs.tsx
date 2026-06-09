"use client";

import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CUSTOMER_CSV_TEMPLATE } from "@/lib/customer/parse-customer-csv";
import { api } from "@/lib/utils";
import type { BulkCreateCustomersResult } from "@/lib/types";

type Props = {
  onCompleted: () => Promise<void> | void;
};

function DialogOverlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-dialog-title"
    >
      <div className="w-full max-w-lg rounded-card bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="customer-dialog-title" className="text-title text-apple-text">
            {title}
          </h2>
          <button
            type="button"
            className="text-apple-glyph hover:text-apple-text"
            onClick={onClose}
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function CustomerRegisterDialogs({ onCompleted }: Props) {
  const [newOpen, setNewOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkCreateCustomersResult | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetNewForm() {
    setName("");
    setAddress("");
    setError(null);
  }

  function resetBulkForm() {
    setBulkResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleCreate() {
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/customers", { name, address });
      resetNewForm();
      setNewOpen(false);
      await onCompleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "登録に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleBulkUpload(file: File) {
    setSaving(true);
    setError(null);
    setBulkResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/customers", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "一括登録に失敗しました");
      }
      setBulkResult(data as BulkCreateCustomersResult);
      await onCompleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "一括登録に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob(["\uFEFF", CUSTOMER_CSV_TEMPLATE], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "顧客一括登録テンプレート.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            resetNewForm();
            setNewOpen(true);
          }}
        >
          新規登録
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            resetBulkForm();
            setBulkOpen(true);
          }}
        >
          一括登録
        </Button>
      </div>

      {newOpen && (
        <DialogOverlay
          title="顧客の新規登録"
          onClose={() => {
            if (!saving) setNewOpen(false);
          }}
        >
          <div className="space-y-4">
            <Input
              label="顧客名"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 株式会社サンプル"
              required
            />
            <Input
              label="住所"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="例: 埼玉県川口市..."
            />
            {error && (
              <p className="text-caption text-red-600" role="alert">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() => setNewOpen(false)}
              >
                キャンセル
              </Button>
              <Button disabled={saving || !name.trim()} onClick={() => void handleCreate()}>
                {saving ? "登録中…" : "登録"}
              </Button>
            </div>
          </div>
        </DialogOverlay>
      )}

      {bulkOpen && (
        <DialogOverlay
          title="顧客の一括登録（CSV）"
          onClose={() => {
            if (!saving) setBulkOpen(false);
          }}
        >
          <div className="space-y-4">
            <p className="text-caption text-apple-glyph">
              UTF-8 の CSV ファイルをアップロードしてください。1行目は
              <code className="mx-1 rounded bg-apple-section px-1">顧客名,住所</code>
              のヘッダー行が必要です。
            </p>
            <button
              type="button"
              className="text-caption text-brand-600 underline"
              onClick={downloadTemplate}
            >
              テンプレート CSV をダウンロード
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="block w-full text-caption"
              disabled={saving}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleBulkUpload(file);
              }}
            />
            {bulkResult && (
              <div className="rounded-card bg-apple-section p-4 text-caption">
                <p>
                  {bulkResult.created}件を登録しました。
                  {bulkResult.skipped > 0 &&
                    ` ${bulkResult.skipped}件をスキップしました。`}
                </p>
                {bulkResult.errors.length > 0 && (
                  <ul className="mt-2 max-h-32 list-disc space-y-1 overflow-y-auto pl-5 text-red-600">
                    {bulkResult.errors.map((msg) => (
                      <li key={msg}>{msg}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {error && (
              <p className="text-caption text-red-600" role="alert">
                {error}
              </p>
            )}
            <div className="flex justify-end">
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() => setBulkOpen(false)}
              >
                閉じる
              </Button>
            </div>
          </div>
        </DialogOverlay>
      )}
    </>
  );
}
