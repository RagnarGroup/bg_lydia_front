import { NextResponse } from "next/server";
import { getMediaBase64 } from "@/lib/lydia-api/client";
import { apiErrorResponse } from "@/lib/lydia-api/api-error";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.key || !body?.message || !body?.messageType || !body?.instanceName) {
    return NextResponse.json({ error: "key, message, messageType e instanceName son requeridos" }, { status: 400 });
  }

  try {
    const media = await getMediaBase64(
      { key: body.key, message: body.message, messageType: body.messageType },
      body.instanceName,
    );
    return NextResponse.json({ dataUrl: `data:${media.mimetype};base64,${media.base64}` });
  } catch (error) {
    return apiErrorResponse(error, "POST /api/lydia/media");
  }
}
