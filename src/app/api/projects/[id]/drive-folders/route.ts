import { NextRequest, NextResponse } from "next/server";
import { ensureProjectDriveFolders } from "@/lib/google/drive";
import { isDriveConfigured } from "@/lib/google/client";
import { withAnyPermission } from "@/lib/permissions/check";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  return withAnyPermission(
    request,
    ["admin_settings", "project_list_other"],
    async ({ session }) => {
      if (!isDriveConfigured()) {
        return NextResponse.json(
          { error: "Google Drive が未設定です" },
          { status: 503 }
        );
      }

      const { id: projectId } = await params;
      try {
        const folders = await ensureProjectDriveFolders(
          session.tenantId,
          projectId
        );
        if (!folders) {
          return NextResponse.json(
            { error: "フォルダ作成に失敗しました" },
            { status: 500 }
          );
        }
        return NextResponse.json({ folders });
      } catch (e) {
        const message = e instanceof Error ? e.message : "フォルダ作成に失敗しました";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }
  );
}
