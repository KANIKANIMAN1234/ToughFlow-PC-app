"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/utils";
import type { DispatchRow } from "@/lib/types";

export default function DispatchEditPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [row, setRow] = useState<DispatchRow | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (id) {
      api
        .get<{ dispatch: DispatchRow }>(`/api/dispatches?id=${id}`)
        .then((d) => setRow(d.dispatch));
    }
  }, [id]);

  async function handleConfirm() {
    if (!row) return;
    setSaving(true);
    try {
      await api.patch("/api/dispatches", { id: row.id, status: "confirmed" });
      router.push("/dispatch");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user || !row) return null;

  return (
    <AppShell
      title="配車表編集"
      breadcrumbs={["ToughFlow", "配車", "編集"]}
    >
      <Card title="SC-071 配車表編集">
        <div className="grid max-w-2xl grid-cols-2 gap-4">
          <Input label="日付" value={row.dispatchDate} readOnly />
          <Input label="担当" value={row.assignee} readOnly />
          <Input
            label="車両"
            value={row.vehicles}
            onChange={(e) => setRow({ ...row, vehicles: e.target.value })}
            className="col-span-2"
          />
          <Input
            label="メモ"
            value={row.memo ?? ""}
            onChange={(e) => setRow({ ...row, memo: e.target.value })}
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
