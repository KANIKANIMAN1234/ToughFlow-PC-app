import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/openai/transcribe";
import { withAnyPermission } from "@/lib/permissions/check";

const ALLOWED_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "video/webm",
]);

export async function POST(request: NextRequest) {
  return withAnyPermission(
    request,
    ["daily_report_register", "site_survey_register", "project_register"],
    async () => {
      const form = await request.formData();
      const file = form.get("file");

      if (!file || !(file instanceof Blob)) {
        return NextResponse.json({ error: "file required" }, { status: 400 });
      }

      const mimeType = file.type || "audio/webm";
      if (!ALLOWED_TYPES.has(mimeType)) {
        return NextResponse.json(
          { error: "対応していない音声形式です" },
          { status: 400 }
        );
      }

      try {
        const buffer = await file.arrayBuffer();
        const name =
          file instanceof File && file.name ? file.name : "recording.webm";
        const result = await transcribeAudio(buffer, mimeType, name);
        return NextResponse.json(result);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "文字起こしに失敗しました";
        const status = message.includes("未設定") ? 503 : 500;
        return NextResponse.json({ error: message }, { status });
      }
    }
  );
}
