import { NextResponse } from "next/server";
import { getConversation, sendMedia } from "@/lib/lydia-api/client";
import { recordMessageSender } from "@/lib/lydia-api/message-sender";
import { apiErrorResponse } from "@/lib/lydia-api/api-error";

const MEDIA_TYPES = ["image", "document", "video", "audio"] as const;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const mediatype = body?.mediatype;
  const media = typeof body?.media === "string" ? body.media : "";

  if (!MEDIA_TYPES.includes(mediatype) || !media) {
    return NextResponse.json({ error: "mediatype y media son requeridos" }, { status: 400 });
  }

  try {
    const conversation = await getConversation(id);
    const sent = await sendMedia(
      conversation.remoteJid,
      conversation.instanceName,
      {
        mediatype,
        media,
        mimetype: body.mimetype,
        fileName: body.fileName,
        caption: body.caption,
      },
      body.quoted ?? undefined,
    );
    await recordMessageSender(conversation.instanceName, sent);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "POST /api/lydia/conversations/[id]/media");
  }
}
