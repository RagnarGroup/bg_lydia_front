import { NextResponse } from "next/server";
import { getBotFlow, resolveWhatsappInstanceName, updateBotFlow } from "@/lib/lydia-api/client";
import type { EvoBotGraph } from "@/lib/lydia-api/types";
import { apiErrorResponse } from "@/lib/lydia-api/api-error";

// LYD-48: mismo criterio que /api/lydia/welcome-message (que reemplaza) --
// la resolucion de instanceName queda de este lado, el front del bot no
// sabe nada de instancias/canales.

export async function GET() {
  try {
    const instanceName = await resolveWhatsappInstanceName();
    if (!instanceName) {
      return NextResponse.json({
        flow: { enabled: false, graph: { startNodeId: null, nodes: [], edges: [] }, warnings: [] },
      });
    }
    const flow = await getBotFlow(instanceName);
    return NextResponse.json({ flow: { enabled: flow.enabled, graph: flow.graph, warnings: flow.warnings } });
  } catch (error) {
    return apiErrorResponse(error, "GET /api/lydia/bot");
  }
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  if (body?.enabled === undefined && body?.graph === undefined) {
    return NextResponse.json({ error: "enabled o graph son requeridos" }, { status: 400 });
  }

  try {
    const instanceName = await resolveWhatsappInstanceName();
    if (!instanceName) {
      return NextResponse.json({ error: "No hay ninguna instancia de WhatsApp conectada" }, { status: 409 });
    }
    const flow = await updateBotFlow(instanceName, {
      enabled: body?.enabled,
      graph: body?.graph as EvoBotGraph | undefined,
    });
    return NextResponse.json({ flow: { enabled: flow.enabled, graph: flow.graph, warnings: flow.warnings } });
  } catch (error) {
    return apiErrorResponse(error, "PUT /api/lydia/bot");
  }
}
