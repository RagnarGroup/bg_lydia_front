"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ContactAvatar } from "@/components/ContactAvatar";
import { useAuth } from "@/components/providers/AuthProvider";
import { LYDIA_API_ENABLED } from "@/lib/lydia-api/config";
import { useConversations } from "@/lib/queries/conversations";
import { useReplyDeadlineAlerts } from "@/lib/hooks/useReplyDeadlineAlerts";
import type { ReplyUrgency } from "@/lib/reply-deadline";
import {
  dismissReplyAlert,
  getReplyAlerts,
  getServerReplyAlerts,
  subscribeReplyAlerts,
  type ReplyAlert,
} from "@/lib/reply-alerts-store";

// Cuantos avisos se ven apilados a la vez; el resto queda contado en un pie.
const MAX_VISIBLE = 4;

const STYLES: Record<ReplyUrgency, { card: string; stripe: string; label: string; icon: string }> = {
  warning: {
    card: "border-amber-300 bg-amber-50",
    stripe: "bg-amber-400",
    label: "text-amber-800",
    icon: "bg-amber-100 text-amber-700",
  },
  overdue: {
    card: "border-red-300 bg-red-50",
    stripe: "bg-red-600",
    label: "text-red-700",
    icon: "bg-red-100 text-red-700",
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
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col-reverse gap-2"
    >
      {visible.map((alert) => {
        const style = STYLES[alert.urgency];
        return (
          <div
            key={alert.id}
            role="alert"
            className={`pointer-events-auto relative flex animate-toast-in items-start gap-3 overflow-hidden rounded-xl border py-3 pl-4 pr-9 shadow-xl ${style.card}`}
          >
            <span className={`absolute inset-y-0 left-0 w-1.5 ${style.stripe}`} aria-hidden />
            <button
              type="button"
              onClick={() => open(alert)}
              className="flex min-w-0 flex-1 items-start gap-3 text-left focus:outline-none"
            >
              {alert.conversationId ? (
                <ContactAvatar seed={alert.avatarSeed} avatarUrl={alert.avatarUrl} className="h-10 w-10 shrink-0" />
              ) : (
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${style.icon}`}>
                  <BellIcon />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className={`flex items-center gap-1 text-xs font-semibold ${style.label}`}>
                  <ClockIcon />
                  {alert.waitingLabel}
                </span>
                <span className="mt-0.5 block truncate font-semibold text-ink">{alert.title}</span>
                <span className="mt-0.5 line-clamp-2 block text-sm text-ink-soft">{alert.body}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => dismissReplyAlert(alert.id)}
              aria-label="Cerrar aviso"
              className="absolute right-2 top-2 rounded-md p-1 text-muted hover:bg-black/5 hover:text-ink"
            >
              <CloseIcon />
            </button>
          </div>
        );
      })}
      {hidden > 0 && (
        <p className="pointer-events-auto self-end rounded-full bg-ink/80 px-3 py-1 text-xs font-medium text-white shadow">
          +{hidden} {hidden === 1 ? "aviso más" : "avisos más"}
        </p>
      )}
    </div>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
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
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
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
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}
