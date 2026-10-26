import "server-only";
import { NextResponse } from "next/server";
import { getCurrentAgent } from "./getCurrentAgent";
import type { SessionPayload } from "./session";
import { apiErrorResponse } from "@/lib/lydia-api/api-error";

// LYD-69: la seccion "Agente" decide que le dice la IA a los clientes, asi que
// solo la toca un administrador (en Lydia, los desarrolladores tambien entran
// con rol administrador). El chequeo real es este, server-side contra la
// sesion firmada -- esconder la pantalla en el cliente es solo UX.
export async function requireAdmin(): Promise<{ session: SessionPayload } | { response: NextResponse }> {
  const session = await getCurrentAgent();
  if (!session) {
    return {
      response: NextResponse.json({ error: "No hay sesion activa" }, { status: 401 }),
    };
  }
  if (session.role !== "administrador") {
    return {
      response: NextResponse.json({ error: "Solo un administrador puede gestionar el agente" }, { status: 403 }),
    };
  }
  return { session };
}

// Mismo mapeo de errores que el resto de los route handlers de Lydia (LYD-110).
export function lydiaErrorResponse(error: unknown, context = "admin"): NextResponse {
  return apiErrorResponse(error, context);
}
