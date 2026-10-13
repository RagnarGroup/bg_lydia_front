import { NextResponse } from "next/server";
import { addLandingNote } from "@/lib/lydia-api/client";
import { readJson, withLandingSession, type LandingParams } from "@/lib/lydia-api/landing-route";

export async function POST(request: Request, { params }: LandingParams) {
  const { id } = await params;
  const body = await readJson(request);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "La nota no puede estar vacia" }, { status: 400 });
  }
  return withLandingSession(async (session) => {
    await addLandingNote(id, session.agentId, content);
    return NextResponse.json({ ok: true }, { status: 201 });
  });
}
