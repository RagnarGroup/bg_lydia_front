import { NextResponse } from "next/server";
import { getConversation, sendReaction } from "@/lib/lydia-api/client";
import { apiErrorResponse } from "@/lib/lydia-api/api-error";

// LYD-52: reaccion rapida con emoji sobre un mensaje puntual del menu
// contextual. No hace falta remoteJid -- sendReaction va contra el
// instanceName de la conversacion, el key ya trae el remoteJid del mensaje.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const key = body?.key;
  const reaction = body?.reaction;

  // LYD-52: reaction "" es valido -- es como se saca una reaccion ya puesta
  // (toggle en MessageContextMenu), no un error de input.
  if (!key || typeof reaction !== "string") {
    return NextResponse.json({ error: "key y reaction son requeridos" }, { status: 400 });
  }

  try {
    const conversation = await getConversation(id);
    await sendReaction(conversation.instanceName, key, reaction);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "POST /api/lydia/conversations/[id]/reactions");
  }
}
