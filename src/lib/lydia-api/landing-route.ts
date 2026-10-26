import "server-only";
import { NextResponse } from "next/server";
import { getCurrentAgent } from "@/lib/auth/getCurrentAgent";
import type { SessionPayload } from "@/lib/auth/session";
import { apiErrorResponse } from "./api-error";

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

// Los 4xx del back (409 "ya lo tomo X", 403, 404, 400) conservan su status;
// el resto es 502, y la falta de configuracion 503 (LYD-110: apiErrorResponse).
export function landingErrorResponse(error: unknown): Response {
  return apiErrorResponse(error, "landing-leads", { propagate4xx: true });
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const body: unknown = await request.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}
