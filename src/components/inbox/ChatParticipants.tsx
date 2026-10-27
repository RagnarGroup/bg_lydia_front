"use client";

import { formatMessageDay, formatMessageTime } from "@/lib/format";
import { useChatParticipants } from "@/lib/queries/conversations";

interface Props {
  conversationId: string;
  assigneeId?: string;
  canUseBackend: boolean;
}

// LYD-117: asesoras que escribieron en la conversacion, ademas del unico
// responsable. Sale de la autoria de cada mensaje (LYD-101): lo enviado antes
// de ese registro o desde el celular no aparece.
export function ChatParticipants({ conversationId, assigneeId, canUseBackend }: Props) {
  const { data: participants = [], isLoading, isError } = useChatParticipants(conversationId, canUseBackend);

  if (!canUseBackend) return null;

  return (
    <div className="mt-4 border-t border-line-soft pt-4">
      <label className="mb-1 block text-xs font-medium text-muted">Asesoras que participaron</label>
      {isLoading ? (
        <p className="text-sm text-muted">Cargando...</p>
      ) : isError ? (
        <p className="text-sm text-muted">No se pudo cargar.</p>
      ) : participants.length === 0 ? (
        <p className="text-sm text-muted">Ninguna asesora escribió desde Lydia todavía.</p>
      ) : (
        <ul className="space-y-1.5">
          {participants.map(({ agent, messages, lastMessageAt }) => (
            <li key={agent.id} className="flex items-start gap-1.5 text-sm">
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand"
                style={agent.color ? { backgroundColor: agent.color } : undefined}
              />
              <div className="min-w-0">
                <p className="truncate text-ink-soft">
                  {agent.name}
                  {agent.id === assigneeId && <span className="ml-1.5 text-[11px] text-muted">(responsable)</span>}
                </p>
                <p className="text-[11px] text-muted">
                  {messages} {messages === 1 ? "mensaje" : "mensajes"} · último {formatMessageDay(lastMessageAt)}{" "}
                  {formatMessageTime(lastMessageAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
