import { NextResponse } from "next/server";
import { searchMessages } from "@/lib/lydia-api/client";
import { adaptMessageSearchHit } from "@/lib/lydia-api/adapters";
import { apiErrorResponse } from "@/lib/lydia-api/api-error";

// LYD-60: busqueda contextual en los mensajes de todas las conversaciones.
// Ruta estatica: Next la resuelve antes que conversations/[id].
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ messages: [] });
  }

  try {
    const result = await searchMessages(q);
    return NextResponse.json({ messages: result.messages.map(adaptMessageSearchHit) });
  } catch (error) {
    return apiErrorResponse(error, "GET /api/lydia/conversations/search");
  }
}
