import { NextRequest, NextResponse } from "next/server";

import { parseProjectEmail } from "@/lib/openai/parse-project-email";
import { withPermission } from "@/lib/permissions/check";

export async function POST(request: NextRequest) {
  return withPermission(request, "project_register", async () => {
    let body: { emailText?: string };
    try {
      body = (await request.json()) as { emailText?: string };
    } catch {
      return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
    }

    const emailText = body.emailText?.trim();
    if (!emailText) {
      return NextResponse.json({ error: "emailText required" }, { status: 400 });
    }

    try {
      const result = await parseProjectEmail(emailText);
      return NextResponse.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "解析に失敗しました";
      const status = message.includes("未設定") ? 503 : 500;
      return NextResponse.json({ error: message }, { status });
    }
  });
}
