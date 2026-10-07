import { NextResponse } from "next/server";
import { suggestReply } from "@/lib/lydia-api/client";

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

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    return NextResponse.json(await suggestReply(id));
  } catch (error) {
    const isConfigError = error instanceof Error && error.name === "LydiaApiConfigError";
    return NextResponse.json({ error: friendlyMessage(error) }, { status: isConfigError ? 503 : 502 });
  }
}
