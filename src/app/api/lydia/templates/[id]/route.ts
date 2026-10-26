import { NextResponse } from "next/server";
import { deleteTemplate, updateTemplate } from "@/lib/lydia-api/client";
import { apiErrorResponse } from "@/lib/lydia-api/api-error";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "body invalido" }, { status: 400 });
  }

  try {
    const template = await updateTemplate(id, body);
    return NextResponse.json({ template });
  } catch (error) {
    return apiErrorResponse(error, "PATCH /api/lydia/templates/[id]");
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await deleteTemplate(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error, "DELETE /api/lydia/templates/[id]");
  }
}
