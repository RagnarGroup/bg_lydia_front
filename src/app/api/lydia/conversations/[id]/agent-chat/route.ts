import { NextResponse } from "next/server";
import { agentChat } from "@/lib/lydia-api/client";

// LYD-68: el back responde con { message: "..." } dentro del texto del error
// ("Lydia API 500 en /crm/...: {json}") -- se rescata ese mensaje para que la UI
// muestre algo entendible en vez del error crudo.
function friendlyMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "Error desconocido";
  const jsonStart = raw.indexOf("{");
  if (jsonStart === -1) return raw;
  try {
    const body = JSON.parse(raw.slice(jsonStart));
    const message = body?.response?.message ?? body?.message;
    const text = Array.isArray(message) ? message.join(" ") : message;
    if (typeof text === "string" && text) return text;
  } catch {
    // body truncado o no JSON: se devuelve el texto crudo
  }
  return raw;
}

// LYD-74: chat de la asesora con el agente IA del panel derecho.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  try {
    return NextResponse.json(await agentChat(id, messages));
  } catch (error) {
    const isConfigError = error instanceof Error && error.name === "LydiaApiConfigError";
    return NextResponse.json({ error: friendlyMessage(error) }, { status: isConfigError ? 503 : 502 });
  }
}
