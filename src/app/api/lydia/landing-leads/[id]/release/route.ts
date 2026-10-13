import { NextResponse } from "next/server";
import { releaseLandingLead } from "@/lib/lydia-api/client";
import { withLandingSession, type LandingParams } from "@/lib/lydia-api/landing-route";

// Solo la responsable o un administrador: lo decide el back con el agentId de la sesion.
export async function POST(_request: Request, { params }: LandingParams) {
  const { id } = await params;
  return withLandingSession(async (session) => {
    await releaseLandingLead(id, session.agentId);
    return NextResponse.json({ ok: true });
  });
}
