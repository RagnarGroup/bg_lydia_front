import "server-only";
import { NextResponse } from "next/server";
import { friendlyMessage } from "./errors";

// LYD-110: respuesta de error comun de los route handlers de /api/lydia/*.
// El detalle tecnico va al log del contenedor (docker logs lydia_frontend);
// al navegador solo llega el mensaje para la persona. Status: 503 si falta
// configuracion, el 4xx del back si se pide propagarlo (landing-leads), 502
// en el resto.
export function apiErrorResponse(error: unknown, context: string, options: { propagate4xx?: boolean } = {}): NextResponse {
  const isConfigError = error instanceof Error && error.name === "LydiaApiConfigError";
  const backStatus = (error as { status?: unknown } | null)?.status;
  const is4xx = typeof backStatus === "number" && backStatus >= 400 && backStatus < 500;

  const detail = error instanceof Error ? error.message : String(error);
  const body = (error as { body?: unknown } | null)?.body;
  console.error(`[lydia-api] ${context}: ${detail}${typeof body === "string" && body.length > 300 ? `\n${body}` : ""}`);

  const status = isConfigError ? 503 : options.propagate4xx && is4xx ? (backStatus as number) : 502;
  return NextResponse.json({ error: friendlyMessage(error) }, { status });
}
