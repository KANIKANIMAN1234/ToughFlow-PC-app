import { NextRequest, NextResponse } from "next/server";
import { formatVoiceText } from "@/lib/openai/format-text";
import { isVoiceFormatContext } from "@/lib/openai/voice-context";
import { withAnyPermission } from "@/lib/permissions/check";

export async function POST(request: NextRequest) {
  return withAnyPermission(
    request,
    ["daily_report_register", "site_survey_register", "project_register"],
    async () => {
      let body: { text?: string; context?: string };
      try {
        body = (await request.json()) as { text?: string; context?: string };
      } catch {
        return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
      }

      const text = body.text?.trim();
      if (!text) {
        return NextResponse.json({ error: "text required" }, { status: 400 });
      }

      const context = body.context ?? "generic";
      if (!isVoiceFormatContext(context)) {
        return NextResponse.json({ error: "invalid context" }, { status: 400 });
      }

      try {
        const result = await formatVoiceText(text, context);
        return NextResponse.json(result);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "AI 整形に失敗しました";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }
  );
}
