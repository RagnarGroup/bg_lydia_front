"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AgentChatLine,
  AgentChatResult,
  InboxAgent,
  InboxConversation,
  InboxMessage,
  InboxMessageSearchHit,
} from "@/lib/lydia-api/inbox-types";
import { LYDIA_API_ENABLED } from "@/lib/lydia-api/config";

// LYD-56: antes esto tiraba un Error generico con el status pegado dentro
// del mensaje (string) -- para armar manejo de errores por codigo (ej.
// distinguir "backend caido, 502/503" de otros casos) hace falta el status
// como campo propio, no parseando texto.
export class LydiaFetchError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "LydiaFetchError";
    this.status = status;
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new LydiaFetchError(res.status, body.error ?? `Error ${res.status}`);
  }
  return body as T;
}

export function useConversations(status: "open" | "resolved" | "all" = "all") {
  return useQuery({
    queryKey: ["conversations", status],
    queryFn: () =>
      fetchJson<{ conversations: InboxConversation[] }>(`/api/lydia/conversations?status=${status}`),
    select: (data) => data.conversations,
    enabled: LYDIA_API_ENABLED,
    retry: false,
    refetchInterval: 15_000,
  });
}

// LYD-60: busqueda en el texto de los mensajes (back, Postgres). `query` ya
// llega con debounce desde ConversationList -- aca no se re-debouncea.
// Sin polling: es una consulta puntual, no algo que tenga que seguir vivo.
export function useMessageSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ["message-search", q],
    queryFn: () =>
      fetchJson<{ messages: InboxMessageSearchHit[] }>(`/api/lydia/conversations/search?q=${encodeURIComponent(q)}`),
    select: (data) => data.messages,
    enabled: LYDIA_API_ENABLED && q.length >= 2,
    retry: false,
    staleTime: 30_000,
  });
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () =>
      fetchJson<{ messages: InboxMessage[] }>(`/api/lydia/conversations/${conversationId}/messages`),
    select: (data) => data.messages,
    enabled: LYDIA_API_ENABLED && conversationId !== null,
    retry: false,
    refetchInterval: 10_000,
  });
}

// LYD-17: los mas recientes (useMessages, arriba) se pollean solos -- el
// historial mas viejo se pide a mano con esto, pagina por pagina, y el
// llamador lo va acumulando (no encaja en el polling de react-query porque
// un refetch normal solo trae la pagina 1 de nuevo).
export function useLoadOlderMessages(conversationId: string | null) {
  return useMutation({
    mutationFn: (page: number) =>
      fetchJson<{ messages: InboxMessage[]; hasMore: boolean }>(
        `/api/lydia/conversations/${conversationId}/messages?page=${page}`,
      ),
  });
}

export function useAgents() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: () => fetchJson<{ agents: InboxAgent[] }>(`/api/lydia/agents`),
    select: (data) => data.agents,
    enabled: LYDIA_API_ENABLED,
    retry: false,
    staleTime: 60_000,
  });
}

export function useAssignAgent(conversationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agentId: string | null) =>
      fetchJson<{ conversation: InboxConversation }>(`/api/lydia/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedAgentId: agentId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

type ConversationsCache = { conversations: InboxConversation[] };

export function useMarkConversationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      fetchJson<{ conversation: InboxConversation }>(`/api/lydia/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unreadMessages: 0 }),
      }),
    // LYD-45: la burbuja de no leidos esperaba el PATCH (que hace un UPDATE
    // sobre Message en el back) y despues un refetch completo de la lista --
    // dos round trips lentos en serie. Se limpia al instante en el cache
    // (lista del inbox y globo del sidebar comparten la misma query) y el
    // refetch de onSettled solo confirma.
    onMutate: async (conversationId) => {
      await queryClient.cancelQueries({ queryKey: ["conversations"] });
      const previous = queryClient.getQueriesData<ConversationsCache>({ queryKey: ["conversations"] });
      queryClient.setQueriesData<ConversationsCache>({ queryKey: ["conversations"] }, (old) =>
        old
          ? {
              ...old,
              conversations: old.conversations.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
            }
          : old,
      );
      return { previous };
    },
    onError: (_error, _conversationId, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

// LYD-40: "cerrar" = archivar (reversible, se oculta de la lista principal).
export function useArchiveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      fetchJson<{ conversation: InboxConversation }>(`/api/lydia/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

// LYD-40: borrado real, irreversible -- el route handler rechaza esto si
// el agente logueado no es administrador (no alcanza con esconder el boton).
// LYD-68: pide una respuesta sugerida por IA; el llamador decide que hacer con
// el texto (el composer lo copia al textarea, nunca se envia solo).
export function useSuggestReply() {
  return useMutation({
    mutationFn: (conversationId: string) =>
      fetchJson<{ suggestion: string }>(`/api/lydia/conversations/${conversationId}/suggest`, { method: "POST" }),
  });
}

// LYD-74: chat con el agente IA. El back guarda las etiquetas que detecta,
// asi que se refresca la lista para que el resto del inbox las vea.
export function useAgentChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, messages }: { conversationId: string; messages: AgentChatLine[] }) =>
      fetchJson<AgentChatResult>(`/api/lydia/conversations/${conversationId}/agent-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useUpdateAgentTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, tags }: { conversationId: string; tags: Record<string, string | null> }) =>
      fetchJson<{ conversation: InboxConversation }>(`/api/lydia/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentTags: tags }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      fetchJson<void>(`/api/lydia/conversations/${conversationId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      // LYD-63: borrar la conversacion tambien borra su lead y los eventos de calendario.
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
    },
  });
}

export function useUpdateConversationContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      contactNameOverride,
      contactPhoneOverride,
    }: {
      conversationId: string;
      contactNameOverride: string;
      contactPhoneOverride: string;
    }) =>
      fetchJson<{ conversation: InboxConversation }>(`/api/lydia/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactNameOverride, contactPhoneOverride }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

// LYD-52: `quoted` es el {key, message} crudo del mensaje al que se responde
// (InboxMessage.raw) -- ausente en un envio normal, sin citar nada.
export interface SendMessageInput {
  content: string;
  quoted?: { key: unknown; message: unknown };
}

export function useSendMessage(conversationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: string | SendMessageInput) => {
      const body = typeof input === "string" ? { content: input } : input;
      return fetchJson<{ ok: true }>(`/api/lydia/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export interface SendMediaInput {
  mediatype: "image" | "document" | "video" | "audio";
  media: string;
  mimetype?: string;
  fileName?: string;
  caption?: string;
  quoted?: { key: unknown; message: unknown };
}

export function useSendMedia(conversationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendMediaInput) =>
      fetchJson<{ ok: true }>(`/api/lydia/conversations/${conversationId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

// LYD-53: nota de voz grabada en el navegador.
export interface SendAudioInput {
  audio: string;
  quoted?: { key: unknown; message: unknown };
}

export function useSendAudio(conversationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendAudioInput) =>
      fetchJson<{ ok: true }>(`/api/lydia/conversations/${conversationId}/audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

// LYD-52: reaccion rapida con emoji sobre un mensaje puntual (menu contextual).
export function useSendReaction(conversationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { key: unknown; reaction: string }) =>
      fetchJson<{ ok: true }>(`/api/lydia/conversations/${conversationId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });
}

// LYD-52: "Reenviar" no tiene ruta propia -- reusa messages/media de la
// conversacion DESTINO, elegida recien al ejecutar (por eso no toma
// conversationId como el resto de los hooks de arriba, sino por mutation).
export interface ForwardMessageInput {
  targetConversationId: string;
  text: string;
  media?: { mediatype: SendMediaInput["mediatype"]; media: string; mimetype?: string; fileName?: string; caption?: string };
}

export function useForwardMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetConversationId, text, media }: ForwardMessageInput) => {
      if (media) {
        return fetchJson<{ ok: true }>(`/api/lydia/conversations/${targetConversationId}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(media),
        });
      }
      return fetchJson<{ ok: true }>(`/api/lydia/conversations/${targetConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
    },
    onSuccess: (_data, { targetConversationId }) => {
      queryClient.invalidateQueries({ queryKey: ["messages", targetConversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

// LYD-15: resuelve el base64 de un mensaje de media bajo demanda -- se
// cachea por messageId asi MessageBubble no vuelve a pedirlo en cada re-render.
function mediaQueryOptions(
  messageId: string,
  raw: { key: unknown; message: unknown; messageType: string },
  instanceName: string,
) {
  return {
    queryKey: ["media", messageId],
    queryFn: () =>
      fetchJson<{ dataUrl: string }>(`/api/lydia/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...raw, instanceName }),
      }),
    retry: false,
    staleTime: Infinity,
  };
}

export function useResolveMedia(
  messageId: string,
  raw: { key: unknown; message: unknown; messageType: string },
  instanceName: string,
  enabled: boolean,
) {
  return useQuery({
    ...mediaQueryOptions(messageId, raw, instanceName),
    select: (data) => data.dataUrl,
    enabled,
  });
}

// LYD-64: mismo cache que useResolveMedia -- si el bubble ya pinto la
// imagen/video sale de ahi sin otro viaje a Evolution API; si es un
// documento que todavia no se cargo, lo pide en el momento de descargar.
export function useFetchMediaDataUrl() {
  const queryClient = useQueryClient();
  return async (messageId: string, raw: { key: unknown; message: unknown; messageType: string }, instanceName: string) => {
    const data = await queryClient.fetchQuery(mediaQueryOptions(messageId, raw, instanceName));
    return data.dataUrl;
  };
}
