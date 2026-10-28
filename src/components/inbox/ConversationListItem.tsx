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

// LYD-118: franja a la izquierda (inset, sin mover el contenido) y fondo suave.
// La franja se mantiene aunque el chat este abierto; el fondo, no.
const URGENCY_STRIPE: Record<ReplyUrgency, string> = {
  warning: "shadow-[inset_4px_0_0_#f59e0b]",
  overdue: "shadow-[inset_4px_0_0_#dc2626]",
};

const URGENCY_ROW: Record<ReplyUrgency, string> = {
  warning: "bg-amber-50 hover:bg-amber-100/70",
  overdue: "bg-red-50 hover:bg-red-100/70",
};

const URGENCY_PILL: Record<ReplyUrgency, string> = {
  warning: "bg-amber-100 text-amber-800",
  overdue: "bg-red-100 text-red-700",
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
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${URGENCY_PILL[urgency]}`}
                title="Tiempo que el cliente lleva esperando respuesta"
              >
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
