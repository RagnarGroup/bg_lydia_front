import { NextResponse } from "next/server";
import { setLandingVisit } from "@/lib/lydia-api/client";
import { readJson, withLandingSession, type LandingParams } from "@/lib/lydia-api/landing-route";
import { VISIT_STATUSES, type VisitStatus } from "@/lib/landing/types";

export async function POST(request: Request, { params }: LandingParams) {
  const { id } = await params;
  const body = await readJson(request);
  const status = body?.status;
  if (typeof status !== "string" || !VISIT_STATUSES.includes(status as VisitStatus)) {
    return NextResponse.json({ error: "Estado de visita invalido" }, { status: 400 });
  }
  const visitAt = typeof body?.visitAt === "string" && body.visitAt ? body.visitAt : undefined;
  if (status === "reprogramada" && (!visitAt || Number.isNaN(new Date(visitAt).getTime()))) {
    return NextResponse.json({ error: "Reprogramar exige una fecha y hora validas" }, { status: 400 });
  }
  const note = typeof body?.note === "string" && body.note.trim() ? body.note.trim() : undefined;

  return withLandingSession(async (session) => {
    const lead = await setLandingVisit(id, session.agentId, { status: status as VisitStatus, visitAt, note });
    return NextResponse.json({ lead });
  });
}
