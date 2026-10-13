import { NextResponse } from "next/server";
import { getLandingLead } from "@/lib/lydia-api/client";
import { withLandingSession, type LandingParams } from "@/lib/lydia-api/landing-route";

export async function GET(_request: Request, { params }: LandingParams) {
  const { id } = await params;
  return withLandingSession(async () => NextResponse.json({ lead: await getLandingLead(id) }));
}
