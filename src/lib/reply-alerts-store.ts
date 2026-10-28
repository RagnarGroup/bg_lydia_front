// LYD-118: avisos en pantalla de "lead sin respuesta". Store minimo fuera de
// React (useSyncExternalStore): el detector (useReplyDeadlineAlerts) empuja
// avisos desde un efecto y los toasts (ReplyDeadlineToasts) solo los leen.

import type { ReplyUrgency } from "./reply-deadline";

export interface ReplyAlert {
  id: string;
  // null = aviso resumen (varios chats a la vez, al abrir Lydia).
  conversationId: string | null;
  urgency: ReplyUrgency;
  title: string;
  body: string;
  waitingLabel: string;
  avatarSeed?: string;
  avatarUrl?: string;
}

// Los amarillos se van solos; los rojos quedan hasta cerrarlos o responder.
const WARNING_AUTO_DISMISS_MS = 12_000;
const MAX_ALERTS = 20;

const EMPTY: ReplyAlert[] = [];
let alerts: ReplyAlert[] = EMPTY;
const listeners = new Set<() => void>();

function setAlerts(next: ReplyAlert[]) {
  if (next === alerts) return;
  alerts = next;
  for (const listener of listeners) listener();
}

export function subscribeReplyAlerts(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getReplyAlerts() {
  return alerts;
}

export function getServerReplyAlerts() {
  return EMPTY;
}

// Un chat tiene a lo sumo un aviso: el rojo reemplaza al amarillo.
export function pushReplyAlert(alert: ReplyAlert) {
  const rest = alerts.filter((a) => a.conversationId === null || a.conversationId !== alert.conversationId);
  setAlerts([alert, ...rest].slice(0, MAX_ALERTS));
  if (alert.urgency === "warning") {
    setTimeout(() => dismissReplyAlert(alert.id), WARNING_AUTO_DISMISS_MS);
  }
}

export function dismissReplyAlert(id: string) {
  if (!alerts.some((a) => a.id === id)) return;
  setAlerts(alerts.filter((a) => a.id !== id));
}

// Se respondio (o se cerro) el chat: su aviso ya no tiene sentido.
export function dropAnsweredReplyAlerts(pendingConversationIds: Set<string>) {
  const next = alerts.filter((a) => a.conversationId === null || pendingConversationIds.has(a.conversationId));
  if (next.length !== alerts.length) setAlerts(next);
}
