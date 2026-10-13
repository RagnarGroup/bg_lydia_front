import { NextResponse } from "next/server";
import { getLandingSummary } from "@/lib/lydia-api/client";
import { withLandingSession } from "@/lib/lydia-api/landing-route";

export async function GET() {
  return withLandingSession(async () => NextResponse.json({ summary: await getLandingSummary() }));
}
