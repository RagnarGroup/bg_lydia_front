import "server-only";
import { getCurrentAgent } from "@/lib/auth/getCurrentAgent";
import { claimConversation } from "./client";

// LYD-77: la asesora que responde un chat sin responsable queda asignada.
// El back solo asigna si el chat no tiene dueño (nunca reasigna); el cambio
// de un chat ya asignado es siempre manual desde "Usuario responsable".
// Best-effort: el mensaje ya salio, un fallo aca no debe convertir el envio
// en error para la asesora.
export async function autoAssignToSender(chatId: string): Promise<void> {
  try {
    const session = await getCurrentAgent();
    if (!session) return;
    await claimConversation(chatId, session.agentId);
  } catch (error) {
    console.error(`No se pudo autoasignar el chat ${chatId}:`, error);
  }
}
