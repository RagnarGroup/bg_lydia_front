import type { InboxConversation } from "@/lib/lydia-api/inbox-types";
import { formatRelativeTime } from "@/lib/format";
import { ContactAvatar } from "@/components/ContactAvatar";
import { ConversationRowMenu } from "./ConversationRowMenu";
import { ChannelBadge } from "./ChannelBadge";

interface Props {
  conversation: InboxConversation;
  active: boolean;
  onClick: () => void;
}

export function ConversationListItem({ conversation, active, onClick }: Props) {
  const { contact } = conversation;

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
        active ? "bg-brand/10" : "hover:bg-bg-subtle"
      }`}
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
