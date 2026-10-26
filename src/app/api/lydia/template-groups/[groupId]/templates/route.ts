import { NextResponse } from "next/server";
import { createTemplate } from "@/lib/lydia-api/client";
import { apiErrorResponse } from "@/lib/lydia-api/api-error";

export async function POST(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const body = await request.json().catch(() => null);
  if (!body?.command || !body?.label || !body?.body) {
    return NextResponse.json({ error: "command, label y body son requeridos" }, { status: 400 });
  }

  try {
    const template = await createTemplate(groupId, body);
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "POST /api/lydia/template-groups/[groupId]/templates");
  }
}
