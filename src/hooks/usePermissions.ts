"use client";

import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import type { AccessLevel } from "@/lib/types";
import { isAccessGranted } from "@/lib/permissions/access";

type PermissionsResponse = {
  accessMap: Record<string, AccessLevel>;
  granted: string[];
};

export function usePermissions() {
  const { user } = useAuth();
  const { data, isLoading } = useApi<PermissionsResponse>(
    user ? "/api/auth/permissions" : null
  );

  function canAccess(permissionCode: string): boolean {
    if (!data?.accessMap) return false;
    return isAccessGranted(data.accessMap[permissionCode] ?? "deny");
  }

  return {
    accessMap: data?.accessMap ?? {},
    granted: data?.granted ?? [],
    canAccess,
    loading: isLoading,
  };
}
