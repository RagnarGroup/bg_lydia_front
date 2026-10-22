import { NextResponse } from "next/server";
import { friendlyMessage } from "@/lib/lydia-api/errors";
import { getMessageDetails, LydiaApiError } from "@/lib/lydia-api/client";

// LYD-105: "Ver detalles" de un mensaje del inbox -- quien lo envio (autoria
// de LYD-101) y su estado de entrega. Solo lectura.
export async function GET(_request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await params;
  try {
    return NextResponse.json(await getMessageDetails(messageId));
  } catch (error) {
    const status = error instanceof LydiaApiError && error.status === 404 ? 404 : 502;
    return NextResponse.json({ error: friendlyMessage(error) }, { status });
  }
}
