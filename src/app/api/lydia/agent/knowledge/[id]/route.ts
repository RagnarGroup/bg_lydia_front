import { NextResponse } from "next/server";
import { deleteAgentKnowledge, updateAgentKnowledge } from "@/lib/lydia-api/client";
import { lydiaErrorResponse, requireAdmin } from "@/lib/auth/requireAdmin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "body invalido" }, { status: 400 });
  }

  try {
    const entry = await updateAgentKnowledge(id, {
      title: body.title,
      category: body.category,
      content: body.content,
      active: body.active,
      updatedBy: auth.session.name,
    });
    return NextResponse.json({ entry });
  } catch (error) {
    return lydiaErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  try {
    await deleteAgentKnowledge(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return lydiaErrorResponse(error);
  }
}
