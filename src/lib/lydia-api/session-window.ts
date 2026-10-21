// LYD-95: ventana de respuesta por canal. Meta (WhatsApp, Messenger, Instagram) permite responder hasta 24 h
// despues del ultimo mensaje del contacto; TikTok, hasta 48 h.
export type WindowChannel = "whatsapp" | "messenger" | "instagram" | "tiktok";

const HOUR_MS = 60 * 60 * 1000;

export function sessionWindowHours(channel: WindowChannel): number {
  return channel === "tiktok" ? 48 : 24;
}

export function sessionWindowMs(channel: WindowChannel): number {
  return sessionWindowHours(channel) * HOUR_MS;
}

// Con mensajes cargados pero ninguno entrante no se bloquea (ver LYD-82): se avisa suave y el back decide.
export function isOutsideSessionWindow(
  channel: WindowChannel,
  lastInboundAt: string | null,
  hasMessages: boolean,
  nowMs: number,
): boolean {
  return hasMessages && lastInboundAt !== null && nowMs - new Date(lastInboundAt).getTime() > sessionWindowMs(channel);
}
