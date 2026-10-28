"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ContactAvatar } from "@/components/ContactAvatar";
import { useAuth } from "@/components/providers/AuthProvider";
import { LYDIA_API_ENABLED } from "@/lib/lydia-api/config";
import { useConversations } from "@/lib/queries/conversations";
import { useReplyDeadlineAlerts } from "@/lib/hooks/useReplyDeadlineAlerts";
import { useRepeatingAlertSound } from "@/lib/hooks/useRepeatingAlertSound";
import type { ReplyUrgency } from "@/lib/reply-deadline";
import {
  dismissReplyAlert,
  getReplyAlerts,
  getServerReplyAlerts,
  subscribeReplyAlerts,
  type ReplyAlert,
} from "@/lib/reply-alerts-store";

// Cuantos avisos se ven apilados a la vez; el resto queda contado en un pie.
const MAX_VISIBLE = 3;

// Colores fuertes a proposito: el aviso tiene que verse aunque la asesora este
// mirando otra cosa de la pantalla.
const STYLES: Record<ReplyUrgency, { card: string; header: string; body: string; button: string; icon: string }> = {
  warning: {
    card: "border-amber-500",
    header: "bg-amber-500 text-white",
    body: "bg-amber-50",
    button: "bg-amber-500 hover:bg-amber-600",
    icon: "bg-amber-500 text-white",
  },
  overdue: {
    card: "border-red-600",
    header: "bg-red-600 text-white",
    body: "bg-red-50",
    button: "bg-red-600 hover:bg-red-700",
    icon: "bg-red-600 text-white",
  },
};

/**
 * LYD-118: avisos de "lead sin respuesta" abajo a la derecha, estilo
 * WhatsApp/Discord. Vive en el layout de la app, asi que se ven en cualquier
 * seccion. Usa la misma query de conversaciones que NavRail (cache compartido
 * de react-query, sin requests de mas).
 */
export function ReplyDeadlineToasts() {
  const { agent } = useAuth();
  const { data: conversations } = useConversations();
  useReplyDeadlineAlerts(conversations, agent?.id ?? null, LYDIA_API_ENABLED);

  const alerts = useSyncExternalStore(subscribeReplyAlerts, getReplyAlerts, getServerReplyAlerts);
  // Sonido en loop mientras haya avisos: el del mas urgente.
  useRepeatingAlertSound(
    alerts.some((a) => a.urgency === "overdue") ? "overdue" : alerts.length > 0 ? "warning" : null,
  );
  const router = useRouter();

  if (alerts.length === 0) return null;

  const visible = alerts.slice(0, MAX_VISIBLE);
  const hidden = alerts.length - visible.length;

  const open = (alert: ReplyAlert) => {
    dismissReplyAlert(alert.id);
    router.push(
      alert.conversationId ? `/comunicaciones/inbox-chat?chat=${alert.conversationId}` : "/comunicaciones/inbox-chat",
    );
  };

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[26rem] max-w-[calc(100vw-2rem)] flex-col-reverse gap-3"
    >
      {visible.map((alert) => {
        const style = STYLES[alert.urgency];
        return (
          <div key={alert.id} role="alert" className="pointer-events-auto relative animate-toast-in rounded-2xl">
            {/* Rojo: resplandor que late hasta que se atiende (fuera de la tarjeta, que recorta). */}
            {alert.urgency === "overdue" && (
              <span className="pointer-events-none absolute inset-0 animate-toast-glow rounded-2xl" aria-hidden />
            )}
            <div className={`relative overflow-hidden rounded-2xl border-2 bg-surface shadow-2xl ${style.card}`}>
              <div className={`flex items-center gap-2 px-4 py-2 text-sm font-bold ${style.header}`}>
                <ClockIcon className="h-5 w-5" />
                <span className="flex-1">{alert.waitingLabel}</span>
                <button
                  type="button"
                  onClick={() => dismissReplyAlert(alert.id)}
                  aria-label="Cerrar aviso"
                  className="rounded-md p-1 text-white/90 hover:bg-white/20 hover:text-white"
                >
                  <CloseIcon />
                </button>
              </div>
              <button
                type="button"
                onClick={() => open(alert)}
                className={`flex w-full items-center gap-4 px-4 py-4 text-left focus:outline-none ${style.body}`}
              >
                {alert.conversationId ? (
                  <ContactAvatar seed={alert.avatarSeed} avatarUrl={alert.avatarUrl} className="h-14 w-14 shrink-0" />
                ) : (
                  <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${style.icon}`}>
                    <BellIcon />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-bold text-ink">{alert.title}</span>
                  <span className="mt-1 line-clamp-2 block text-[15px] leading-snug text-ink-soft">{alert.body}</span>
                  <span
                    className={`mt-3 inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold text-white ${style.button}`}
                  >
                    {alert.conversationId ? "Responder ahora" : "Ver chats"}
                  </span>
                </span>
              </button>
            </div>
          </div>
        );
      })}
      {hidden > 0 && (
        <p className="pointer-events-auto self-end rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-white shadow-lg">
          +{hidden} {hidden === 1 ? "aviso más" : "avisos más"}
        </p>
      )}
    </div>
  );
}

function ClockIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-12.5a.75.75 0 0 0-1.5 0V10c0 .2.08.39.22.53l2.5 2.5a.75.75 0 1 0 1.06-1.06l-2.28-2.28V5.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-7 w-7" aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 2a6 6 0 0 0-6 6c0 1.89-.45 3.67-1.24 5.24a.75.75 0 0 0 .55 1.08 32.9 32.9 0 0 0 3.26.48 3.5 3.5 0 0 0 6.86 0 32.9 32.9 0 0 0 3.26-.48.75.75 0 0 0 .55-1.08A11.95 11.95 0 0 1 16 8a6 6 0 0 0-6-6Zm-1.95 13.04a32.7 32.7 0 0 0 3.9 0 2 2 0 0 1-3.9 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}
