import { NextRequest, NextResponse } from "next/server";
import { upsertUser } from "@/lib/store/mock-store";
import { DEMO_TENANT_CODE } from "@/lib/seed/masters";
import type { User, UserRole } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { tenantCode, userName, role = "office" } = body as {
    tenantCode: string;
    userName: string;
    role?: UserRole;
  };

  if (tenantCode.trim().toUpperCase() !== DEMO_TENANT_CODE) {
    return NextResponse.json(
      { error: "会社コードが正しくありません（デモ: TOTSUKA）" },
      { status: 400 }
    );
  }

  const user: User = {
    id: `user-${role}-${userName.replace(/\s/g, "")}`,
    name: userName || (role === "admin" ? "管理者" : "事務担当"),
    role,
    tenantId: "tenant-totsuka",
    tenantName: "株式会社戸塚重量",
  };

  upsertUser(user);
  const response = NextResponse.json({ user });
  response.cookies.set("tf_user", JSON.stringify(user), {
    httpOnly: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("tf_user");
  return response;
}
