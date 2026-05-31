"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User, UserRole } from "@/lib/types";
import { api } from "@/lib/utils";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (tenantCode: string, userName: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const COOKIE_KEY = "tf_user";

function readUserFromCookie(): User | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_KEY}=`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match.split("=")[1])) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(readUserFromCookie());
    setLoading(false);
  }, []);

  const login = useCallback(
    async (tenantCode: string, userName: string, role: UserRole) => {
      const { user: loggedIn } = await api.post<{ user: User }>(
        "/api/auth/mock-login",
        { tenantCode, userName, role }
      );
      setUser(loggedIn);
    },
    []
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/mock-login", { method: "DELETE" });
    setUser(null);
    document.cookie = `${COOKIE_KEY}=; path=/; max-age=0`;
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
