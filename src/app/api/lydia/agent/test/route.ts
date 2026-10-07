import { NextResponse } from "next/server";
import { testAgentSuggestion } from "@/lib/lydia-api/client";
import { lydiaErrorResponse, requireAdmin } from "@/lib/auth/requireAdmin";

// Prueba de la pantalla "Agente": sugerencia para un mensaje escrito a mano.
// No envia nada a ningun cliente.
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json(
      { error: "message es requerido" },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await testAgentSuggestion(message));
  } catch (error) {
    return lydiaErrorResponse(error);
  }
}
