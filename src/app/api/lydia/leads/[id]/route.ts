import { NextResponse } from "next/server";
import { deleteLead, updateLead } from "@/lib/lydia-api/client";
import { adaptLead } from "@/lib/lydia-api/adapters";
import { apiErrorResponse } from "@/lib/lydia-api/api-error";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "body invalido" }, { status: 400 });
  }

  try {
    const lead = await updateLead(id, body);
    return NextResponse.json({ lead: adaptLead(lead) });
  } catch (error) {
    return apiErrorResponse(error, "PATCH /api/lydia/leads/[id]");
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await deleteLead(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error, "DELETE /api/lydia/leads/[id]");
  }
}
