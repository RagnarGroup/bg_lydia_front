import { NextResponse } from "next/server";
import { claimLandingLead } from "@/lib/lydia-api/client";
import { withLandingSession, type LandingParams } from "@/lib/lydia-api/landing-route";

// 409 si ya lo tiene otra asesora: el back incluye su nombre en el mensaje y
// withLandingSession lo propaga con el mismo status.
export async function POST(_request: Request, { params }: LandingParams) {
  const { id } = await params;
  return withLandingSession(async (session) => {
    await claimLandingLead(id, session.agentId);
    return NextResponse.json({ ok: true });
  });
}
