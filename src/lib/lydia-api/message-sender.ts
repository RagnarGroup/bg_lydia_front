import "server-only";
import { getCurrentAgent } from "@/lib/auth/getCurrentAgent";
import { claimConversation, recordMessageAuthor } from "./client";
import type { EvoSentMessage } from "./types";

// LYD-77: la asesora que responde un chat sin responsable queda asignada.
// El back solo asigna si el chat no tiene dueño (nunca reasigna); el cambio
// de un chat ya asignado es siempre manual desde "Usuario responsable".
// LYD-101: ademas registra que asesora envio el mensaje (auditoria comercial
// diaria, LYD-102).
// Best-effort: el mensaje ya salio, un fallo aca no debe convertir el envio
// en error para la asesora.
export async function autoAssignToSender(chatId: string, instanceName: string, sent: EvoSentMessage): Promise<void> {
  const session = await getCurrentAgent().catch(() => null);
  if (!session) return;

  const messageKeyId = sent?.key?.id;
  if (messageKeyId) {
    try {
      await recordMessageAuthor(instanceName, messageKeyId, session.agentId);
    } catch (error) {
      console.error(`No se pudo registrar la autoria del mensaje ${messageKeyId}:`, error);
    }
  }

  try {
    await claimConversation(chatId, session.agentId);
  } catch (error) {
    console.error(`No se pudo autoasignar el chat ${chatId}:`, error);
  }
}
