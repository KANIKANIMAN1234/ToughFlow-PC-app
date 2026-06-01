"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/lib/types";

const ROLE_PRESETS: { role: UserRole; label: string; userName: string }[] = [
  { role: "office", label: "事務", userName: "事務担当" },
  { role: "admin", label: "管理者", userName: "管理者" },
  { role: "manager", label: "部長", userName: "部長" },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [tenantCode, setTenantCode] = useState("TOTSUKA");
  const [userName, setUserName] = useState("事務担当");
  const [role, setRole] = useState<UserRole>("office");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError("");
    setLoading(true);
    try {
      await login(tenantCode, userName, role);
      router.replace("/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-6">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black text-brand-700">ToughFlow</h1>
          <p className="mt-1 text-sm text-slate-500">事務・管理者向け PC 版</p>
        </div>
        <div className="space-y-4">
          <Input
            label="会社コード"
            value={tenantCode}
            onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
          />
          <Input
            label="お名前"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          <label className="block space-y-1">
            <span className="text-sm font-medium">ロール</span>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={role}
              onChange={(e) => {
                const next = e.target.value as UserRole;
                setRole(next);
                const preset = ROLE_PRESETS.find((p) => p.role === next);
                if (preset) setUserName(preset.userName);
              }}
            >
              {ROLE_PRESETS.map((p) => (
                <option key={p.role} value={p.role}>
                  {p.label}（{p.role}）
                </option>
              ))}
            </select>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button fullWidth disabled={loading} onClick={handleLogin}>
            {loading ? "ログイン中…" : "ログイン"}
          </Button>
          <p className="text-center text-xs text-slate-400">
            m_user に登録されたユーザー名でログインします
          </p>
        </div>
      </div>
    </div>
  );
}
