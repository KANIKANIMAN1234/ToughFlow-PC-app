import { NextRequest, NextResponse } from "next/server";

import {
  createProjectWithAssignments,
  listProjects,
} from "@/lib/db/repository";
import { ensureProjectDriveFolders } from "@/lib/google/drive";
import { isDriveConfigured } from "@/lib/google/client";
import { withAnyPermission, withPermission } from "@/lib/permissions/check";
import type { CreateProjectInput } from "@/lib/types";

export async function GET(request: NextRequest) {
  return withAnyPermission(
    request,
    ["project_list_other", "daily_report_register", "site_survey_register"],
    async ({ session }) => {
      try {
        const projects = await listProjects(session.tenantId, {
          userId: session.id,
          role: session.role,
        });
        return NextResponse.json({ projects });
      } catch (e) {
        const message = e instanceof Error ? e.message : "取得に失敗しました";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }
  );
}

export async function POST(request: NextRequest) {
  return withPermission(request, "project_register", async ({ session }) => {
    try {
      const body = (await request.json()) as CreateProjectInput;
      const project = await createProjectWithAssignments(
        session.tenantId,
        body
      );

      let driveCreated = false;
      let driveWarning: string | undefined;
      if (isDriveConfigured()) {
        try {
          const folders = await ensureProjectDriveFolders(
            session.tenantId,
            project.id
          );
          driveCreated = Boolean(folders?.projectFolderId);
        } catch (e) {
          driveWarning =
            e instanceof Error ? e.message : "Driveフォルダ作成に失敗しました";
          console.error("[projects] drive folder failed:", e);
        }
      }

      return NextResponse.json(
        { project, driveCreated, driveWarning },
        { status: 201 }
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "登録に失敗しました";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  });
}
