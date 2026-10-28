import { NextResponse } from "next/server";
import { getConversation, listMessages, sendMessage } from "@/lib/lydia-api/client";
import { adaptMessage } from "@/lib/lydia-api/adapters";
import { recordMessageSender } from "@/lib/lydia-api/message-sender";
import { apiErrorResponse } from "@/lib/lydia-api/api-error";

function errorResponse(error: unknown) {
  return apiErrorResponse(error, "/api/lydia/conversations/[id]/messages");
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
    const sent = await sendMessage(conversation.remoteJid, conversation.instanceName, content, quoted);
    await recordMessageSender(conversation.instanceName, sent);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
