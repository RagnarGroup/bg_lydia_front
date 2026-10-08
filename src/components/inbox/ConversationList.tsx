"use client";

import { useMemo, useState } from "react";
import type { InboxChannel, InboxConversation } from "@/lib/lydia-api/inbox-types";
import { CHANNEL_FILTERS } from "@/lib/lydia-api/channel";
import { ConversationListItem } from "./ConversationListItem";
import { MessageSearchResultItem } from "./MessageSearchResultItem";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useMessageSearch } from "@/lib/queries/conversations";
import { contactMatches } from "@/lib/highlight";

type StatusFilter = "todos" | "abierto" | "sin_respuesta" | "cerrado";
type ChannelFilter = InboxChannel | "todos";

const filters: { id: StatusFilter; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "abierto", label: "Abiertos" },
  { id: "sin_respuesta", label: "Sin respuesta" },
  { id: "cerrado", label: "Resueltos" },
];

interface Props {
  conversations: InboxConversation[];
  isLoading: boolean;
  error: Error | null;
  selectedConversationId: string | null;
  onSelect: (conversationId: string) => void;
  // LYD-60: click en un resultado de la seccion "Mensajes" del buscador.
  onSelectMessage: (conversationId: string, messageId: string) => void;
  selectedMessageId: string | null;
  // LYD-60: en modo mock no hay back donde buscar dentro de los mensajes.
  messageSearchEnabled: boolean;
}

// LYD-60: mismo minimo que exige el back (SEARCH_MIN_LENGTH en crm-search.util.ts).
const MESSAGE_SEARCH_MIN_LENGTH = 2;

export function ConversationList({
  conversations,
  isLoading,
  error,
  selectedConversationId,
  onSelect,
  onSelectMessage,
  selectedMessageId,
  messageSearchEnabled,
}: Props) {
  const [search, setSearch] = useState("");
  // LYD-60: el filtro de contactos es local e instantaneo; la busqueda en
  // mensajes va al back, con debounce para no pegarle en cada tecla.
  const query = search.trim();
  const isSearching = query.length > 0;
  const debouncedQuery = useDebouncedValue(query, 300);
  const messageSearch = useMessageSearch(messageSearchEnabled ? debouncedQuery : "");
  const messageSearchPending =
    messageSearchEnabled &&
    query.length >= MESSAGE_SEARCH_MIN_LENGTH &&
    (debouncedQuery !== query || messageSearch.isFetching);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("todos");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  // LYD-31: filtro por canal, mismo patron que el de estado.
  const [activeChannel, setActiveChannel] = useState<ChannelFilter>("todos");
  const [channelMenuOpen, setChannelMenuOpen] = useState(false);
  useEscapeKey(filterMenuOpen, () => setFilterMenuOpen(false));
  useEscapeKey(channelMenuOpen, () => setChannelMenuOpen(false));

  const filtered = useMemo(() => {
    return conversations.filter((conversation) => {
      // LYD-60: nombre o telefono (por digitos), como la seccion "Contactos" de WhatsApp.
      if (query && !contactMatches(query, conversation.contact.name, conversation.contact.phone)) return false;
      if (activeChannel !== "todos" && conversation.inboxChannel !== activeChannel) return false;
      if (activeFilter === "todos") return true;
      return conversation.status === activeFilter;
    });
  }, [conversations, query, activeFilter, activeChannel]);

  // LYD-60: los resultados de mensajes respetan el filtro de canal y de
  // estado igual que la lista -- si no, un click abriria un chat que no esta
  // en la lista visible.
  const conversationById = useMemo(() => new Map(conversations.map((c) => [c.id, c])), [conversations]);
  const messageHits = useMemo(() => {
    if (!isSearching || debouncedQuery !== query) return [];
    return (messageSearch.data ?? []).filter((hit) => {
      if (activeChannel !== "todos" && hit.inboxChannel !== activeChannel) return false;
      const conversation = conversationById.get(hit.conversationId);
      if (!conversation) return false; // p.ej. archivada o todavia no cargada en la lista
      return activeFilter === "todos" || conversation.status === activeFilter;
    });
  }, [isSearching, debouncedQuery, query, messageSearch.data, activeChannel, activeFilter, conversationById]);

  return (
    <section className="flex h-full w-full shrink-0 flex-col border-r border-line bg-surface md:w-96">
      <div className="border-b border-line-soft p-3">
        <div className="relative">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="text"
            aria-label="Buscar contactos y mensajes"
            placeholder="Buscar contactos o mensajes"
            className="w-full rounded-lg border border-line bg-bg-subtle py-2 pl-9 pr-8 text-sm text-ink-soft placeholder:text-muted focus:border-brand focus:outline-none"
          />
          {isSearching && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Limpiar busqueda"
              className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-line-soft hover:text-ink-soft"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-b border-line-soft px-3 py-2">
        <div className="flex items-center gap-1">
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={filterMenuOpen}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-soft hover:bg-bg-subtle"
            >
              {filters.find((f) => f.id === activeFilter)?.label}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {filterMenuOpen && (
              <div
                role="menu"
                className="absolute left-0 z-10 mt-1 w-40 rounded-md border border-line bg-surface py-1 text-sm shadow-lg"
              >
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActiveFilter(filter.id);
                      setFilterMenuOpen(false);
                    }}
                    className={`block w-full px-3 py-1.5 text-left hover:bg-bg-subtle ${
                      filter.id === activeFilter ? "font-semibold text-brand" : "text-ink-soft"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* LYD-31: filtro por canal (WhatsApp/Messenger/Instagram), mismo patron que el de estado. */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setChannelMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={channelMenuOpen}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-soft hover:bg-bg-subtle"
            >
              {CHANNEL_FILTERS.find((f) => f.id === activeChannel)?.label}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {channelMenuOpen && (
              <div
                role="menu"
                className="absolute left-0 z-10 mt-1 w-44 rounded-md border border-line bg-surface py-1 text-sm shadow-lg"
              >
                {CHANNEL_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActiveChannel(filter.id);
                      setChannelMenuOpen(false);
                    }}
                    className={`block w-full px-3 py-1.5 text-left hover:bg-bg-subtle ${
                      filter.id === activeChannel ? "font-semibold text-brand" : "text-ink-soft"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted">
          Total: {filtered.length}
          <span className="h-1 w-1 rounded-full bg-muted-2" />
        </div>
      </div>

      <div className="scroll-slim flex-1 overflow-y-auto">
        {isLoading && <p className="px-4 py-6 text-center text-sm text-muted">Cargando conversaciones…</p>}
        {error && (
          <p className="px-4 py-6 text-center text-sm text-danger">No se pudo cargar el inbox: {error.message}</p>
        )}
        {!isLoading && !error && !isSearching && filtered.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted">Sin conversaciones para este filtro.</p>
        )}
        {isSearching && <SectionHeader label="Contactos" />}
        {isSearching && !isLoading && filtered.length === 0 && (
          <p className="px-4 py-3 text-sm text-muted">Ningún contacto coincide.</p>
        )}
        {filtered.map((conversation) => (
          <ConversationListItem
            key={conversation.id}
            conversation={conversation}
            active={conversation.id === selectedConversationId && selectedMessageId === null}
            onClick={() => onSelect(conversation.id)}
          />
        ))}

        {/* LYD-60: coincidencias dentro del texto de los mensajes (busqueda en el back). */}
        {isSearching && messageSearchEnabled && (
          <>
            <SectionHeader label="Mensajes" />
            {query.length < MESSAGE_SEARCH_MIN_LENGTH ? (
              <p className="px-4 py-3 text-sm text-muted">
                Escribí al menos {MESSAGE_SEARCH_MIN_LENGTH} caracteres para buscar en los mensajes.
              </p>
            ) : messageSearchPending && messageHits.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted">Buscando en los mensajes…</p>
            ) : messageSearch.error ? (
              <p className="px-4 py-3 text-sm text-danger">No se pudo buscar en los mensajes.</p>
            ) : messageHits.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted">Ningún mensaje coincide.</p>
            ) : (
              messageHits.map((hit) => (
                <MessageSearchResultItem
                  key={hit.messageId}
                  hit={hit}
                  contact={conversationById.get(hit.conversationId)?.contact}
                  query={query}
                  active={hit.messageId === selectedMessageId}
                  onClick={() => onSelectMessage(hit.conversationId, hit.messageId)}
                />
              ))
            )}
          </>
        )}
      </div>
    </section>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="sticky top-0 z-[1] border-b border-line-soft bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand">
      {label}
    </p>
  );
}
