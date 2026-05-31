import { NextRequest, NextResponse } from "next/server";
import {
  addMasterItem,
  getCompanyInfo,
  listMaster,
  resetMasterSeed,
  updateCompanyInfo,
  updateMasterItem,
} from "@/lib/store/mock-store";
import type { MasterType } from "@/lib/types";

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") as MasterType | null;
  const includeInactive =
    request.nextUrl.searchParams.get("includeInactive") === "true";

  if (type) {
    return NextResponse.json({ items: listMaster(type, includeInactive) });
  }
  return NextResponse.json({ companyInfo: getCompanyInfo() });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, action, item } = body as {
    type: MasterType;
    action?: "reset";
    item?: Record<string, unknown>;
  };

  if (action === "reset") {
    return NextResponse.json({ items: resetMasterSeed(type) });
  }

  const created = addMasterItem(type, item ?? { name: "新規項目" });
  return NextResponse.json({ item: created }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { type, id, patch, companyInfo } = body as {
    type?: MasterType;
    id?: string;
    patch?: Record<string, unknown>;
    companyInfo?: Record<string, string>;
  };

  if (companyInfo) {
    return NextResponse.json({ companyInfo: updateCompanyInfo(companyInfo) });
  }

  if (!type || !id || !patch) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const updated = updateMasterItem(type, id, patch);
  if (!updated) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ item: updated });
}
