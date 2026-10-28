import "server-only";
import { getCurrentAgent } from "@/lib/auth/getCurrentAgent";
import { recordMessageAuthor } from "./client";
import type { EvoSentMessage } from "./types";

// LYD-101: registra que asesora envio el mensaje (auditoria comercial diaria,
// LYD-102, y participacion por chat). LYD-123: ya no asigna responsable.
// Best-effort: el mensaje ya salio, un fallo aca no debe convertir el envio
// en error para la asesora.
export async function recordMessageSender(instanceName: string, sent: EvoSentMessage): Promise<void> {
  const session = await getCurrentAgent().catch(() => null);
  const messageKeyId = sent?.key?.id;
  if (!session || !messageKeyId) return;

  try {
    await recordMessageAuthor(instanceName, messageKeyId, session.agentId);
  } catch (error) {
    console.error(`No se pudo registrar la autoria del mensaje ${messageKeyId}:`, error);
  }
}
