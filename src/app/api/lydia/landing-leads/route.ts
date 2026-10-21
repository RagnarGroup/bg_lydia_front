import { NextResponse } from "next/server";
import { listLandingLeads } from "@/lib/lydia-api/client";
import { withLandingSession } from "@/lib/lydia-api/landing-route";
import { VISIT_STATUSES, type LandingLeadTipo, type VisitStatus } from "@/lib/landing/types";

// LYD-84: lista de leads del formulario web (cola compartida, sin asignacion automatica).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const visitStatus = searchParams.get("visitStatus");
  const tipo = searchParams.get("tipo");
  const filters = {
    sede: searchParams.get("sede") || undefined,
    visitStatus: VISIT_STATUSES.includes(visitStatus as VisitStatus) ? (visitStatus as VisitStatus) : undefined,
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
    unclaimed: searchParams.get("unclaimed") === "true",
    search: searchParams.get("search")?.trim() || undefined,
    tipo: tipo === "visita" || tipo === "consulta" ? (tipo as LandingLeadTipo) : undefined,
  };
  return withLandingSession(async () => NextResponse.json({ leads: await listLandingLeads(filters) }));
}
