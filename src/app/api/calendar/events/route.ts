import { NextRequest, NextResponse } from "next/server";

import { listGoogleCalendarEvents } from "@/lib/google/calendar";
import { withAnyPermission } from "@/lib/permissions/check";

export async function GET(request: NextRequest) {
  return withAnyPermission(
    request,
    ["dispatch_list_view", "dispatch_view"],
    async () => {
      const from = request.nextUrl.searchParams.get("from")?.trim();
      const to = request.nextUrl.searchParams.get("to")?.trim();

      if (!from || !to) {
        return NextResponse.json(
          { error: "from と to パラメータが必要です" },
          { status: 400 }
        );
      }

      try {
        const events = await listGoogleCalendarEvents(from, to);
        return NextResponse.json({ events });
      } catch (e) {
        const message = e instanceof Error ? e.message : "取得に失敗しました";
        const status = message.includes("未設定") ? 503 : 500;
        return NextResponse.json({ error: message }, { status });
      }
    }
  );
}
