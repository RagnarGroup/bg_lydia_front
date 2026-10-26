import { NextResponse } from "next/server";
import { createCalendarEvent, listCalendarEvents } from "@/lib/lydia-api/client";
import { adaptCalendarEvent } from "@/lib/lydia-api/adapters";
import { apiErrorResponse } from "@/lib/lydia-api/api-error";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId") ?? undefined;
  const leadId = searchParams.get("leadId") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  try {
    const events = await listCalendarEvents({ agentId, leadId, from, to });
    return NextResponse.json({ events: events.map(adaptCalendarEvent) });
  } catch (error) {
    return apiErrorResponse(error, "GET /api/lydia/calendar-events");
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.type || !body?.startAt || !body?.endAt) {
    return NextResponse.json({ error: "type, startAt y endAt son requeridos" }, { status: 400 });
  }

  try {
    const event = await createCalendarEvent(body);
    return NextResponse.json({ event: adaptCalendarEvent(event) }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "POST /api/lydia/calendar-events");
  }
}
