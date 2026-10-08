import { NextResponse } from "next/server";
import { getConversation, listMessages, sendMessage } from "@/lib/lydia-api/client";
import { adaptMessage } from "@/lib/lydia-api/adapters";
import { autoAssignToSender } from "@/lib/lydia-api/auto-assign";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Error desconocido";
  const isConfigError = error instanceof Error && error.name === "LydiaApiConfigError";
  return NextResponse.json({ error: message }, { status: isConfigError ? 503 : 502 });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = Number(new URL(request.url).searchParams.get("page") ?? "1") || 1;
  try {
    const conversation = await getConversation(id);
    const { messages, reactionsByMessageId, hasMore } = await listMessages(
      conversation.remoteJid,
      conversation.instanceName,
      page,
    );
    return NextResponse.json({
      messages: messages.map((m) => adaptMessage(m, reactionsByMessageId.get(m.key.id))),
      hasMore,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const quoted = body?.quoted ?? undefined;

  if (!content) {
    return NextResponse.json({ error: "content es requerido" }, { status: 400 });
  }

  try {
    const conversation = await getConversation(id);
    await sendMessage(conversation.remoteJid, conversation.instanceName, content, quoted);
    await autoAssignToSender(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
