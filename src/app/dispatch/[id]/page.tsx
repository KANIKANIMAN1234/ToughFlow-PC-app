"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { DetailSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { api } from "@/lib/utils";
import type { DispatchRow } from "@/lib/types";

export default function DispatchEditPage() {
  const { id } = useParams<{ id: string }>();
  const { user, authLoading } = useAuthGuard();
  const router = useRouter();
  const { data, isLoading } = useApi<{ dispatch: DispatchRow }>(
    user && id ? `/api/dispatches?id=${id}` : null
  );
  const [row, setRow] = useState<DispatchRow | null>(null);
  const [saving, setSaving] = useState(false);

  const displayRow = row ?? data?.dispatch ?? null;

  async function handleConfirm() {
    if (!displayRow) return;
    setSaving(true);
    try {
      await api.patch("/api/dispatches", {
        id: displayRow.id,
        status: "confirmed",
      });
      router.push("/dispatch");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user) {
    return (
      <AppShell title="配車表編集" breadcrumbs={["ToughFlow", "配車", "編集"]}>
        <DetailSkeleton />
      </AppShell>
    );
  }

  if (isLoading && !displayRow) {
    return (
      <AppShell title="配車表編集" breadcrumbs={["ToughFlow", "配車", "編集"]}>
        <DetailSkeleton />
      </AppShell>
    );
  }

  if (!displayRow) return null;

  return (
    <AppShell
      title="配車表編集"
      breadcrumbs={["ToughFlow", "配車", "編集"]}
    >
      <Card title="SC-071 配車表編集">
        <div className="grid max-w-2xl grid-cols-2 gap-4">
          <Input label="日付" value={displayRow.dispatchDate} readOnly />
          <Input label="担当" value={displayRow.assignee} readOnly />
          <Input
            label="車両"
            value={displayRow.vehicles}
            onChange={(e) =>
              setRow({ ...displayRow, vehicles: e.target.value })
            }
            className="col-span-2"
          />
          <Input
            label="メモ"
            value={displayRow.memo ?? ""}
            onChange={(e) => setRow({ ...displayRow, memo: e.target.value })}
            className="col-span-2"
          />
        </div>
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" onClick={() => router.back()}>
            戻る
          </Button>
          <Button disabled={saving} onClick={handleConfirm}>
            確定（confirmed）
          </Button>
        </div>
      </Card>
    </AppShell>
  );
}
