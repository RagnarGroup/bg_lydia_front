import type { InboxConversation } from "@/lib/lydia-api/inbox-types";
import { formatRelativeTime } from "@/lib/format";
import { ContactAvatar } from "@/components/ContactAvatar";
import { ConversationRowMenu } from "./ConversationRowMenu";
import { ChannelBadge } from "./ChannelBadge";
import { formatWaiting, minutesWaiting, replyUrgency, type ReplyUrgency } from "@/lib/reply-deadline";

interface Props {
  conversation: InboxConversation;
  active: boolean;
  onClick: () => void;
  // LYD-118: hora actual para el color de "sin respuesta" (ver ConversationList).
  nowMs: number;
}

// LYD-118: franja a la izquierda (inset, sin mover el contenido) y fondo
// saturado, para que un chat atrasado se distinga de un vistazo. La franja se
// mantiene aunque el chat este abierto; el fondo, no.
const URGENCY_STRIPE: Record<ReplyUrgency, string> = {
  warning: "shadow-[inset_6px_0_0_#f59e0b]",
  overdue: "shadow-[inset_6px_0_0_#dc2626]",
};

const URGENCY_ROW: Record<ReplyUrgency, string> = {
  warning: "bg-amber-200/80 hover:bg-amber-200",
  overdue: "bg-red-200/80 hover:bg-red-200",
};

const URGENCY_PILL: Record<ReplyUrgency, string> = {
  warning: "bg-amber-500 text-white",
  overdue: "bg-red-600 text-white animate-pulse",
};

export function ConversationListItem({ conversation, active, onClick, nowMs }: Props) {
  const { contact } = conversation;
  const urgency = replyUrgency(conversation.awaitingReplySince, nowMs);
  const waited = urgency ? minutesWaiting(conversation.awaitingReplySince, nowMs) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        // Sin este chequeo, Enter/Espacio en el boton de 3 puntos (adentro
        // de esta fila) burbujeaba hasta aca y seleccionaba la conversacion
        // en vez de abrir el menu -- el kebab quedaba inalcanzable por
        // teclado (LYD-40).
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group flex w-full items-start gap-3 border-b border-line-soft px-4 py-3 text-left transition-colors ${
        active ? "bg-brand/10" : urgency ? URGENCY_ROW[urgency] : "hover:bg-bg-subtle"
      } ${urgency ? URGENCY_STRIPE[urgency] : ""}`}
    >
      <div className="relative shrink-0">
        <ContactAvatar seed={contact.lydiaContactId} avatarUrl={contact.avatarUrl} className="h-10 w-10" />
        {/* LYD-31: de que canal es esta conversacion. LYD-78: logo del canal en vez del punto de color. */}
        <ChannelBadge channel={conversation.inboxChannel} className="absolute -bottom-1 -right-1 ring-2 ring-white" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          {/* LYD-30: sin el id interno de la conversacion (UUID de la base): no lo entienden las asesoras y truncaba el nombre. */}
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate font-semibold text-ink">{contact.name}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {urgency && waited !== null && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold shadow-sm ${URGENCY_PILL[urgency]}`}
                title="Tiempo que el cliente lleva esperando respuesta"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-12.5a.75.75 0 0 0-1.5 0V10c0 .2.08.39.22.53l2.5 2.5a.75.75 0 1 0 1.06-1.06l-2.28-2.28V5.5Z"
                    clipRule="evenodd"
                  />
                </svg>
                {formatWaiting(waited)}
              </span>
            )}
            <span className="text-xs text-muted">{formatRelativeTime(conversation.lastMessageAt)}</span>
            {/* LYD-40: solo visible al pasar el mouse (o con foco por teclado) -- no siempre presente. */}
            <div className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <ConversationRowMenu conversationId={conversation.id} />
            </div>
          </div>
        </div>
        <p
          className={`mt-1 truncate text-sm ${
            conversation.unreadCount > 0 ? "font-semibold text-ink" : "text-ink-soft"
          }`}
        >
          {conversation.lastMessagePreview || "Sin mensajes todavía"}
        </p>
      </div>

      {conversation.unreadCount > 0 && (
        <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-white">
          {conversation.unreadCount}
        </span>
      )}
    </div>
  );
}
