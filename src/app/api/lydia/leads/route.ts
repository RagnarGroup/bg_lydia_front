import { NextResponse } from "next/server";
import { createLead, listLeads } from "@/lib/lydia-api/client";
import { adaptLead } from "@/lib/lydia-api/adapters";
import type { LeadStage } from "@/lib/lydia-api/types";
import { apiErrorResponse } from "@/lib/lydia-api/api-error";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stage = (searchParams.get("stage") as LeadStage | null) ?? undefined;
  const assignedAgentId = searchParams.get("assignedAgentId") ?? undefined;
  const source = searchParams.get("source") ?? undefined;
  const chatId = searchParams.get("chatId") ?? undefined;

  try {
    const leads = await listLeads({ stage, assignedAgentId, source, chatId });
    return NextResponse.json({ leads: leads.map(adaptLead) });
  } catch (error) {
    return apiErrorResponse(error, "GET /api/lydia/leads");
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.contactName || !body?.source) {
    return NextResponse.json({ error: "contactName y source son requeridos" }, { status: 400 });
  }

  try {
    const lead = await createLead(body);
    return NextResponse.json({ lead: adaptLead(lead) }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "POST /api/lydia/leads");
  }
}
