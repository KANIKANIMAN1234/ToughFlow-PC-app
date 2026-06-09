"use client";

import { AppShell } from "@/components/layout/AppShell";
import { ProjectRegisterForm } from "@/components/project/ProjectRegisterForm";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";

export default function ProjectRegisterPage() {
  const { user, loading, allowed } = usePermissionGuard("project_register");

  if (loading || !user || !allowed) {
    return (
      <AppShell
        title="新規案件登録"
        breadcrumbs={["ToughFlow", "案件", "新規登録"]}
      >
        <TableSkeleton rows={6} cols={3} />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="新規案件登録"
      breadcrumbs={["ToughFlow", "案件", "新規登録"]}
    >
      <ProjectRegisterForm />
    </AppShell>
  );
}
