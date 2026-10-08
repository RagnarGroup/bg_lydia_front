"use client";

import { useMemo, useState } from "react";
import { useConversations } from "@/lib/queries/conversations";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { Icon } from "@/components/icons";

interface Props {
  excludeConversationId: string;
  onPick: (targetConversationId: string) => void;
  onClose: () => void;
}

// LYD-52: selector de conversacion destino para "Reenviar". No hay ruta de
// envio propia -- el llamador (ChatThread) reusa messages/media apuntando a
// la conversacion que se elija aca (ver useForwardMessage).
export function ForwardMessageDialog({ excludeConversationId, onPick, onClose }: Props) {
  const [query, setQuery] = useState("");
  const { data: conversations = [], isLoading } = useConversations("all");
  useEscapeKey(true, onClose);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations
      .filter((c) => c.id !== excludeConversationId)
      .filter((c) => !q || c.contact.name.toLowerCase().includes(q) || (c.contact.phone ?? "").includes(q));
  }, [conversations, excludeConversationId, query]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="flex max-h-[70vh] w-80 flex-col rounded-xl border border-line bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
          <p className="text-sm font-semibold text-ink">Reenviar a…</p>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-muted hover:text-ink-soft">
            <Icon name="equis" size={16} />
          </button>
        </div>
        <div className="border-b border-line-soft p-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar conversación…"
            className="w-full rounded-lg border border-line bg-bg-subtle px-3 py-1.5 text-sm focus:outline-none"
          />
        </div>
        <div className="scroll-slim flex-1 overflow-y-auto p-1.5">
          {isLoading && <p className="px-2 py-2 text-xs text-muted">Cargando conversaciones…</p>}
          {!isLoading && filtered.length === 0 && <p className="px-2 py-2 text-xs text-muted">Sin resultados.</p>}
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c.id)}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-ink-soft hover:bg-bg-subtle"
            >
              <span className="truncate">{c.contact.name}</span>
              {c.contact.phone && <span className="shrink-0 text-xs text-muted">{c.contact.phone}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
