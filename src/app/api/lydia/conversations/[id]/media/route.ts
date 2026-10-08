import { NextResponse } from "next/server";
import { getConversation, sendMedia } from "@/lib/lydia-api/client";
import { autoAssignToSender } from "@/lib/lydia-api/auto-assign";

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
    await sendMedia(
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
    await autoAssignToSender(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    const isConfigError = error instanceof Error && error.name === "LydiaApiConfigError";
    return NextResponse.json({ error: message }, { status: isConfigError ? 503 : 502 });
  }
}
