"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

export function usePermissionGuard(permissionCode: string) {
  const { user, loading: authLoading } = useAuth();
  const { canAccess, loading: permLoading } = usePermissions();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (authLoading || permLoading) return;
    if (!user) {
      const params = new URLSearchParams();
      if (pathname && pathname !== "/login") params.set("returnTo", pathname);
      const query = params.toString();
      router.replace(query ? `/login?${query}` : "/login");
      return;
    }
    if (!canAccess(permissionCode)) router.replace("/home");
  }, [user, authLoading, permLoading, canAccess, permissionCode, router, pathname]);

  return {
    user,
    allowed: canAccess(permissionCode),
    loading: authLoading || permLoading,
  };
}
