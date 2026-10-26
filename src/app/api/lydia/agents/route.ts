import { NextResponse } from "next/server";
import { listAgents } from "@/lib/lydia-api/client";
import { adaptAgent } from "@/lib/lydia-api/adapters";
import { apiErrorResponse } from "@/lib/lydia-api/api-error";

export async function GET() {
  try {
    const agents = await listAgents();
    return NextResponse.json({ agents: agents.map(adaptAgent) });
  } catch (error) {
    return apiErrorResponse(error, "GET /api/lydia/agents");
  }
}
