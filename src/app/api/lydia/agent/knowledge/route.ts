import { NextResponse } from "next/server";
import { createAgentKnowledge, listAgentKnowledge } from "@/lib/lydia-api/client";
import { lydiaErrorResponse, requireAdmin } from "@/lib/auth/requireAdmin";

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  try {
    return NextResponse.json({ knowledge: await listAgentKnowledge() });
  } catch (error) {
    return lydiaErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "body invalido" }, { status: 400 });
  }

  try {
    const entry = await createAgentKnowledge({
      title: body.title,
      category: body.category,
      content: body.content,
      active: body.active,
      updatedBy: auth.session.name,
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return lydiaErrorResponse(error);
  }
}
