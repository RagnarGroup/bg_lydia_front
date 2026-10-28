// LYD-118: alertas de lead sin respuesta. El back calcula desde cuando espera
// cada chat (awaitingReplySince: primer mensaje del cliente despues de la
// ultima respuesta humana, solo si escribio en las ultimas 24 h); aca se
// decide el nivel segun cuanto lleva esperando.

export type ReplyUrgency = "warning" | "overdue";

export const REPLY_WARNING_MINUTES = 5;
export const REPLY_OVERDUE_MINUTES = 10;

const MINUTE_MS = 60_000;

export function minutesWaiting(awaitingReplySince: string | null | undefined, nowMs: number): number | null {
  if (!awaitingReplySince) return null;
  const since = new Date(awaitingReplySince).getTime();
  if (Number.isNaN(since)) return null;
  return Math.max(0, Math.floor((nowMs - since) / MINUTE_MS));
}

export function replyUrgency(awaitingReplySince: string | null | undefined, nowMs: number): ReplyUrgency | null {
  const minutes = minutesWaiting(awaitingReplySince, nowMs);
  if (minutes === null) return null;
  if (minutes >= REPLY_OVERDUE_MINUTES) return "overdue";
  if (minutes >= REPLY_WARNING_MINUTES) return "warning";
  return null;
}

// "7 min", "1 h 05 min", "3 h": lo que muestran la fila y el aviso.
export function formatWaiting(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest.toString().padStart(2, "0")} min`;
}

// Los avisos (toast + sonido) son para la asesora responsable del chat, o para
// todas si nadie lo tomo todavia. La lista se colorea igual para todos.
export function isMyAlert(assigneeId: string | undefined, myAgentId: string | null | undefined): boolean {
  return !assigneeId || (!!myAgentId && assigneeId === myAgentId);
}

// Clave de un aviso ya mostrado: el mismo chat vuelve a avisar si sube de
// nivel o si, despues de una respuesta, el cliente escribe de nuevo (cambia
// awaitingReplySince).
export function alertKey(conversationId: string, awaitingReplySince: string, urgency: ReplyUrgency): string {
  return `${conversationId}|${awaitingReplySince}|${urgency}`;
}
