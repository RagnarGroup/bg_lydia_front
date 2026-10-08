"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useAgentChat, useUpdateAgentTags } from "@/lib/queries/conversations";
import type { AgentChatLine } from "@/lib/lydia-api/inbox-types";

// LYD-73/LYD-74: etiquetas del playbook comercial, una por categoria. Se
// guardan por conversacion; la IA las actualiza en cada respuesta y la
// asesora las corrige a mano. Mismos valores que AGENT_TAG_OPTIONS en
// lydia_bg_back (agent-tags.ts): si se cambia uno, cambiar el otro.
const TAG_GROUPS = [
  {
    id: "intencion",
    label: "Intención",
    options: [
      "Frío",
      "Interesado",
      "Alta intención",
      "Objeción",
      "Postergado",
      "Cerrado",
      "Perdido",
    ],
  },
  {
    id: "decisor",
    label: "Habla con",
    options: ["Alumno", "Mamá", "Papá", "Esposo/a", "Tercero"],
  },
  {
    id: "accion",
    label: "Siguiente acción",
    options: [
      "Visita",
      "Llamada",
      "Horario",
      "Evaluación",
      "Matrícula",
      "Pago",
      "Follow-up",
    ],
  },
  {
    id: "fuente",
    label: "Fuente",
    options: [
      "Meta",
      "TikTok",
      "Volanteo",
      "Banner",
      "Referido",
      "Walk-in",
      "Otro",
    ],
  },
] as const;

type TagGroupId = (typeof TAG_GROUPS)[number]["id"];

type ChatItem =
  | { id: number; role: "asesora"; text: string }
  | { id: number; role: "ia"; text: string; suggestion?: string }
  | { id: number; role: "error"; text: string };
type NewChatItem = ChatItem extends infer T
  ? T extends ChatItem
    ? Omit<T, "id">
    : never
  : never;

interface Props {
  conversationId: string;
  initialTags?: Record<string, string>;
  // Sin backend (modo mock) no hay donde guardar etiquetas ni a quien preguntar.
  canUseBackend: boolean;
  // Cambia cada vez que la asesora pulsa el foco del composer: pide una
  // sugerencia nueva sin escribir indicaciones.
  requestId: number;
  onUseSuggestion: (text: string) => void;
}

export function AgentAssistantPanel({
  conversationId,
  initialTags,
  canUseBackend,
  requestId,
  onUseSuggestion,
}: Props) {
  const [tags, setTags] = useState<Partial<Record<TagGroupId, string>>>(
    initialTags ?? {},
  );
  const [items, setItems] = useState<ChatItem[]>([]);
  const [draft, setDraft] = useState("");
  const nextId = useRef(1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const agentChat = useAgentChat();
  const updateTags = useUpdateAgentTags();

  const push = (item: NewChatItem) =>
    setItems((prev) => [
      ...prev,
      { ...item, id: nextId.current++ } as ChatItem,
    ]);

  // El historial que ve la IA: lo que escribio la asesora y lo que respondio
  // ella misma (con la respuesta sugerida), sin los avisos de error.
  const toLines = (list: ChatItem[]): AgentChatLine[] =>
    list.flatMap((item): AgentChatLine[] => {
      if (item.role === "asesora")
        return [{ role: "asesora", text: item.text }];
      if (item.role === "ia")
        return [
          {
            role: "ia",
            text: item.suggestion
              ? `${item.text} Respuesta sugerida: "${item.suggestion}"`
              : item.text,
          },
        ];
      return [];
    });

  const askAgent = (history: ChatItem[]) => {
    if (!canUseBackend) {
      push({
        role: "error",
        text: "El asistente solo funciona con el backend conectado.",
      });
      return;
    }
    agentChat.mutate(
      { conversationId, messages: toLines(history) },
      {
        onSuccess: ({ reply, suggestion, tags: nextTags }) => {
          push({
            role: "ia",
            text: reply || "Te sugiero responder así:",
            suggestion: suggestion ?? undefined,
          });
          setTags(nextTags);
        },
        onError: (error) =>
          push({
            role: "error",
            text: `No se pudo consultar a la IA: ${error.message}`,
          }),
      },
    );
  };

  const handleSend = () => {
    const text = draft.trim();
    if (!text || agentChat.isPending) return;
    const item: ChatItem = { id: nextId.current++, role: "asesora", text };
    setItems((prev) => [...prev, item]);
    setDraft("");
    askAgent([...items, item]);
  };

  const handleTagChange = (group: TagGroupId, value: string) => {
    setTags((prev) => ({ ...prev, [group]: value || undefined }));
    if (canUseBackend)
      updateTags.mutate({ conversationId, tags: { [group]: value || null } });
  };

  const handledRequest = useRef(0);
  useEffect(() => {
    if (requestId === 0 || requestId === handledRequest.current) return;
    handledRequest.current = requestId;
    askAgent(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo reacciona a un pedido nuevo del foco
  }, [requestId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [items.length, agentChat.isPending]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0">
        <p className="mb-1.5 text-xs font-medium text-muted">Etiquetas</p>
        <div className="grid grid-cols-2 gap-2">
          {TAG_GROUPS.map((group) => (
            <label key={group.id} className="block">
              <span className="mb-0.5 block text-[11px] text-muted">
                {group.label}
              </span>
              <select
                value={tags[group.id] ?? ""}
                onChange={(e) => handleTagChange(group.id, e.target.value)}
                className={`w-full rounded-md border border-line px-2 py-1.5 text-xs focus:border-brand focus:outline-none ${
                  tags[group.id] ? "font-medium text-ink" : "text-muted"
                }`}
              >
                <option value="">Sin definir</option>
                {group.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col border-t border-line-soft pt-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted">
          <Icon name="chispa" size={13} className="text-brand" />
          Asistente IA
        </p>

        <div className="scroll-slim min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
          {items.length === 0 && !agentChat.isPending && (
            <p className="rounded-lg bg-bg-subtle px-3 py-2.5 text-xs text-muted">
              Pídele una respuesta o dale una indicación, por ejemplo: “ofrécele
              una visita el sábado” o “responde la objeción de precio”. También
              puedes pulsar el foco del mensaje.
            </p>
          )}

          {items.map((item) =>
            item.role === "asesora" ? (
              <div key={item.id} className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-brand px-3 py-2 text-sm text-white">
                  {item.text}
                </p>
              </div>
            ) : item.role === "error" ? (
              <p
                key={item.id}
                className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger"
              >
                {item.text}
              </p>
            ) : (
              <div
                key={item.id}
                className="max-w-[95%] rounded-2xl rounded-bl-sm bg-bg-subtle px-3 py-2 text-sm text-ink-soft"
              >
                <p>{item.text}</p>
                {item.suggestion && (
                  <>
                    <blockquote className="mt-2 border-l-2 border-brand pl-2.5 italic text-ink">
                      “{item.suggestion}”
                    </blockquote>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => onUseSuggestion(item.suggestion!)}
                        className="rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-dark"
                      >
                        Usar
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          navigator.clipboard?.writeText(item.suggestion!)
                        }
                        className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs text-ink-soft hover:bg-surface"
                      >
                        <Icon name="copiar" size={12} />
                        Copiar
                      </button>
                    </div>
                  </>
                )}
              </div>
            ),
          )}

          {agentChat.isPending && (
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Icon
                name="chispa"
                size={13}
                className="animate-pulse text-brand"
              />
              Pensando…
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="mt-2 flex items-end gap-2 rounded-xl border border-line bg-surface p-1.5 focus-within:border-brand">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={2}
            spellCheck
            lang="es"
            placeholder="Indícale a la IA qué necesitas…"
            className="min-w-0 flex-1 resize-none px-1.5 py-1 text-sm text-ink-soft placeholder:text-muted focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || agentChat.isPending}
            aria-label="Enviar indicación"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-muted-2"
          >
            <Icon name="enviar" size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
