"use client";

import { useMemo } from "react";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import type { AccessLevel } from "@/lib/types";
import { isAccessGranted } from "@/lib/permissions/access";
import { buildDefaultAccessMap } from "@/lib/permissions/defaults";

type PermissionsResponse = {
  accessMap: Record<string, AccessLevel>;
  granted: string[];
};

export function usePermissions() {
  const { user } = useAuth();
  const { data, isLoading, error } = useApi<PermissionsResponse>(
    user ? "/api/auth/permissions" : null
  );

  const accessMap = useMemo(() => {
    if (data?.accessMap && Object.keys(data.accessMap).length > 0) {
      return data.accessMap;
    }
    if (user?.role) return buildDefaultAccessMap(user.role);
    return {};
  }, [data?.accessMap, user?.role]);

  const granted = useMemo(
    () =>
      data?.granted ??
      Object.entries(accessMap)
        .filter(([, level]) => isAccessGranted(level))
        .map(([code]) => code),
    [data?.granted, accessMap]
  );

  function canAccess(permissionCode: string): boolean {
    return isAccessGranted(accessMap[permissionCode] ?? "deny");
  }

  return {
    accessMap,
    granted,
    canAccess,
    loading: isLoading && !error && !!user && !data,
  };
}
