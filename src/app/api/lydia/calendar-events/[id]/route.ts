import { NextResponse } from "next/server";
import { deleteCalendarEvent, updateCalendarEvent } from "@/lib/lydia-api/client";
import { adaptCalendarEvent } from "@/lib/lydia-api/adapters";
import { apiErrorResponse } from "@/lib/lydia-api/api-error";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "body invalido" }, { status: 400 });
  }

  try {
    const event = await updateCalendarEvent(id, body);
    return NextResponse.json({ event: adaptCalendarEvent(event) });
  } catch (error) {
    return apiErrorResponse(error, "PATCH /api/lydia/calendar-events/[id]");
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await deleteCalendarEvent(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error, "DELETE /api/lydia/calendar-events/[id]");
  }
}
