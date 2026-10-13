import { NextResponse } from "next/server";
import { setLandingStage } from "@/lib/lydia-api/client";
import { readJson, withLandingSession, type LandingParams } from "@/lib/lydia-api/landing-route";
import { pipelineStages } from "@/lib/mock-data";
import type { LeadStage } from "@/lib/lydia-api/types";

export async function POST(request: Request, { params }: LandingParams) {
  const { id } = await params;
  const body = await readJson(request);
  const stage = body?.stage;
  if (typeof stage !== "string" || !pipelineStages.some((s) => s.id === stage)) {
    return NextResponse.json({ error: "Etapa invalida" }, { status: 400 });
  }
  return withLandingSession(async (session) => {
    await setLandingStage(id, session.agentId, stage as LeadStage);
    return NextResponse.json({ ok: true });
  });
}
