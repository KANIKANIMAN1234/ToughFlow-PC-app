"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { getPunchButtonClassName, PUNCH_BUTTONS } from "@/lib/attendance/labels";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import type { AttendancePunchType, AttendanceStatus } from "@/lib/types";

async function fetchStatus(): Promise<AttendanceStatus> {
  const res = await fetch("/api/attendance", { credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "取得に失敗しました");
  return data.status;
}

export function AttendancePunchBar() {
  const { canAccess, loading: permLoading } = usePermissions();
  const [submitting, setSubmitting] = useState<AttendancePunchType | null>(null);
  const { data: status, mutate, isLoading } = useSWR(
    canAccess("attendance_register") ? "/api/attendance" : null,
    fetchStatus,
    { refreshInterval: 60_000 }
  );

  const punch = useCallback(
    async (punchType: AttendancePunchType) => {
      setSubmitting(punchType);
      try {
        const res = await fetch("/api/attendance", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ punchType }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "打刻に失敗しました");
        await mutate(data.status, false);
      } catch (e) {
        alert(e instanceof Error ? e.message : "打刻に失敗しました");
      } finally {
        setSubmitting(null);
      }
    },
    [mutate]
  );

  if (permLoading || !canAccess("attendance_register")) return null;

  const allowed = new Set(status?.allowedTypes ?? []);

  return (
    <div className="flex items-center gap-1.5">
      {PUNCH_BUTTONS.map(({ type, label }) => {
        const enabled = allowed.has(type) && !isLoading && submitting === null;
        return (
          <button
            key={type}
            type="button"
            disabled={!enabled}
            onClick={() => punch(type)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-caption font-semibold transition-colors focus-apple",
              getPunchButtonClassName(type, enabled),
              !enabled && "cursor-not-allowed",
              submitting === type && "opacity-90"
            )}
          >
            {submitting === type ? "…" : label}
          </button>
        );
      })}
    </div>
  );
}
