import { NextResponse } from "next/server";
import { createTemplateGroup, listTemplateGroups } from "@/lib/lydia-api/client";
import { adaptTemplateGroup } from "@/lib/lydia-api/adapters";
import { apiErrorResponse } from "@/lib/lydia-api/api-error";

export async function GET() {
  try {
    const groups = await listTemplateGroups();
    return NextResponse.json({ groups: groups.map(adaptTemplateGroup) });
  } catch (error) {
    return apiErrorResponse(error, "GET /api/lydia/template-groups");
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.title) {
    return NextResponse.json({ error: "title es requerido" }, { status: 400 });
  }

  try {
    const group = await createTemplateGroup(body.title);
    return NextResponse.json({ group: adaptTemplateGroup(group) }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "POST /api/lydia/template-groups");
  }
}
