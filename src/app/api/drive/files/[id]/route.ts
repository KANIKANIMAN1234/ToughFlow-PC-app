import { NextRequest, NextResponse } from "next/server";
import { downloadDriveFile } from "@/lib/google/download";
import { withAnyPermission } from "@/lib/permissions/check";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withAnyPermission(
    request,
    [
      "site_survey_register",
      "site_survey_view_shared",
      "expense_register",
      "daily_report_register",
      "daily_report_view_all",
    ],
    async () => {
      const { id } = await params;
      try {
        const file = await downloadDriveFile(id);
        if (!file) {
          return NextResponse.json({ error: "not found" }, { status: 404 });
        }

        return new NextResponse(new Uint8Array(file.buffer), {
          headers: {
            "Content-Type": file.mimeType,
            "Cache-Control": "private, max-age=3600",
          },
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "取得に失敗しました";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }
  );
}
