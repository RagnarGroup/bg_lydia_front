import { NextResponse } from "next/server";
import { getChatParticipants } from "@/lib/lydia-api/client";
import { apiErrorResponse } from "@/lib/lydia-api/api-error";

// LYD-117: asesoras que escribieron en la conversacion (panel Detalle). Solo lectura.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    return NextResponse.json(await getChatParticipants(id));
  } catch (error) {
    return apiErrorResponse(error, "GET /api/lydia/conversations/[id]/participants");
  }
}
