import "server-only";
import { NextResponse } from "next/server";
import { getCurrentAgent } from "@/lib/auth/getCurrentAgent";
import type { SessionPayload } from "@/lib/auth/session";
import { friendlyMessage } from "./errors";
import { LydiaApiError } from "./client";

// LYD-84: manejo comun de los route handlers de /api/lydia/landing-leads.

export type LandingParams = { params: Promise<{ id: string }> };

// Mutaciones y lecturas exigen sesion; el agentId sale SIEMPRE de aca.
export async function withLandingSession(run: (session: SessionPayload) => Promise<Response>): Promise<Response> {
  const session = await getCurrentAgent();
  if (!session) {
    return NextResponse.json({ error: "No hay sesion activa" }, { status: 401 });
  }
  try {
    return await run(session);
  } catch (error) {
    return landingErrorResponse(error);
  }
}

// Los 4xx del back (409 "ya lo tomo X", 403, 404, 400) se propagan tal cual con
// su mensaje; el resto es 502, y la falta de configuracion 503.
export function landingErrorResponse(error: unknown): Response {
  if (error instanceof LydiaApiError && error.status >= 400 && error.status < 500) {
    return NextResponse.json({ error: friendlyMessage(error) }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Error desconocido";
  const isConfigError = error instanceof Error && error.name === "LydiaApiConfigError";
  return NextResponse.json({ error: message }, { status: isConfigError ? 503 : 502 });
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const body: unknown = await request.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}
