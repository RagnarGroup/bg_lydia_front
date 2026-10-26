import { NextResponse } from "next/server";
import { getConversation, sendAudio } from "@/lib/lydia-api/client";
import { autoAssignToSender } from "@/lib/lydia-api/auto-assign";
import { apiErrorResponse } from "@/lib/lydia-api/api-error";

// LYD-53: nota de voz grabada en el navegador (base64 inline, mismo patron
// que media/route.ts). El `quoted` opcional viene del reply activo en el
// composer, igual que en messages/media.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const audio = typeof body?.audio === "string" ? body.audio : "";

  if (!audio) {
    return NextResponse.json({ error: "audio es requerido" }, { status: 400 });
  }

  try {
    const conversation = await getConversation(id);
    const sent = await sendAudio(conversation.remoteJid, conversation.instanceName, audio, body.quoted ?? undefined);
    await autoAssignToSender(id, conversation.instanceName, sent);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "POST /api/lydia/conversations/[id]/audio");
  }
}
