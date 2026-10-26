import { NextResponse } from "next/server";
import { friendlyMessage } from "@/lib/lydia-api/errors";
import { apiErrorResponse } from "@/lib/lydia-api/api-error";
import { getMessageDetails, LydiaApiError } from "@/lib/lydia-api/client";

// LYD-105: "Ver detalles" de un mensaje del inbox -- quien lo envio (autoria
// de LYD-101) y su estado de entrega. Solo lectura.
export async function GET(_request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await params;
  try {
    return NextResponse.json(await getMessageDetails(messageId));
  } catch (error) {
    if (error instanceof LydiaApiError && error.status === 404) {
      return NextResponse.json({ error: friendlyMessage(error) }, { status: 404 });
    }
    return apiErrorResponse(error, "GET /api/lydia/messages/[messageId]/details");
  }
}
