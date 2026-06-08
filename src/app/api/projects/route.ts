import { NextRequest, NextResponse } from "next/server";

import { listProjects } from "@/lib/db/repository";

import { withAnyPermission } from "@/lib/permissions/check";



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

