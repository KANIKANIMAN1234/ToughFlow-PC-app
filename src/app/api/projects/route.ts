import { NextResponse } from "next/server";
import { listProjects } from "@/lib/store/mock-store";

export async function GET() {
  return NextResponse.json({ projects: listProjects() });
}
