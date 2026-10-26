import { NextResponse } from "next/server";
import { agentChat } from "@/lib/lydia-api/client";
import { apiErrorResponse } from "@/lib/lydia-api/api-error";

// LYD-74: chat de la asesora con el agente IA del panel derecho.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  try {
    return NextResponse.json(await agentChat(id, messages));
  } catch (error) {
    return apiErrorResponse(error, "POST /api/lydia/conversations/[id]/agent-chat");
  }
}
