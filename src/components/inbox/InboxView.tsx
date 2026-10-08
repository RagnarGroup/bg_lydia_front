"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LydiaFetchError,
  useConversations,
  useForwardMessage,
  useLoadOlderMessages,
  useMarkConversationRead,
  useMessages,
  useSendAudio,
  useSendMedia,
  useSendMessage,
  useSendReaction,
  useUpdateConversationContact,
} from "@/lib/queries/conversations";
import { getMockMessages, mockInboxConversations } from "@/lib/lydia-api/mock-fallback";
import { LYDIA_API_ENABLED } from "@/lib/lydia-api/config";
import type { InboxMessage } from "@/lib/lydia-api/inbox-types";
import { ConversationList } from "./ConversationList";
import { LeadDetailPanel, type SidePanelView } from "./LeadDetailPanel";
import { ChatThread } from "./ChatThread";
import type { ComposerAudioInput, ComposerMediaInput, ComposerQuoted } from "./Composer";
import { Icon } from "@/components/icons";
import { useNewMessageAlerts } from "@/lib/hooks/useNewMessageAlerts";
import { requestNotificationPermissionIfNeeded } from "@/lib/notifications";

// Sin configurar (dev local sin .env.local) -- guia tecnica, no deberia
// aparecer nunca en produccion (ahi siempre esta configurado).
function MockModeBanner() {
  return (
    <div className="flex items-center gap-2 border-b border-accent/30 bg-accent/10 px-4 py-2 text-xs text-accent-dark">
      <Icon name="ajustes" size={14} className="shrink-0" />
      <span>
        Viendo datos de ejemplo — la conexión al backend de Lydia está apagada. Poné{" "}
        <code className="rounded bg-white/50 px-1">NEXT_PUBLIC_LYDIA_API_ENABLED=true</code> en{" "}
        <code className="rounded bg-white/50 px-1">.env.local</code> junto con las credenciales para conectar el inbox
        real.
      </span>
    </div>
  );
}

// LYD-56: configurado y funcionando normalmente, pero la llamada de este
// momento fallo (tipico durante un redeploy de evolution-api, que tarda unos
// segundos en volver a responder) -- mensaje para la asesora, no para quien
// programa. El codigo va aparte, chico, como base para ir distinguiendo
// casos (ej. 401 vs 502) mas adelante.
function BackendDownBanner({ error }: { error: Error }) {
  const code = error instanceof LydiaFetchError ? error.status : null;
  return (
    <div className="flex items-center gap-2 border-b border-accent/30 bg-accent/10 px-4 py-2 text-xs text-accent-dark">
      <Icon name="ajustes" size={14} className="shrink-0" />
      <span>
        Estamos actualizando el servicio — esperá un momento y volvé a intentar.
        {code && <code className="ml-1.5 rounded bg-white/50 px-1">Error {code}</code>}
      </span>
    </div>
  );
}

export function InboxView() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  // LYD-60: mensaje elegido desde la seccion "Mensajes" del buscador -- el
  // hilo hace scroll hasta el y lo resalta. null = abrir el chat normal (abajo).
  const [focusMessageId, setFocusMessageId] = useState<string | null>(null);
  // LYD-18: en mobile el inbox alterna entre lista y chat en vez de apilar
  // las tres columnas (lista + detalle + hilo) -- a partir de `md` siempre
  // se ven ambas y este estado no importa (las clases responsive lo tapan).
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");
  // LYD-73: vista del panel derecho (se mantiene al cambiar de chat), pedido
  // de sugerencia desde el foco del composer y texto elegido en el chat del
  // agente para pasarlo al composer.
  const [sidePanelView, setSidePanelView] = useState<SidePanelView>("detalle");
  const [agentRequestId, setAgentRequestId] = useState(0);
  const [injectedText, setInjectedText] = useState<{
    id: number;
    text: string;
  } | null>(null);
  const [mockDrafts, setMockDrafts] = useState<Record<string, InboxMessage[]>>({});
  // LYD-14: en modo mock (o mientras el backend no responde) el override de
  // nombre/telefono se guarda solo en memoria -- no hay Chat real donde
  // persistirlo.
  const [mockContactOverrides, setMockContactOverrides] = useState<Record<string, { name: string; phone: string }>>({});

  const { data: realConversations = [], isLoading, error } = useConversations("all");
  const isMockMode = !LYDIA_API_ENABLED || error !== null;
  const conversations = useMemo(() => {
    const base = isMockMode ? mockInboxConversations : realConversations;
    if (!isMockMode) return base;
    return base.map((c) => {
      const override = mockContactOverrides[c.id];
      if (!override) return c;
      return {
        ...c,
        contact: {
          ...c.contact,
          name: override.name || c.contact.name,
          phone: override.phone || c.contact.phone,
        },
      };
    });
  }, [isMockMode, realConversations, mockContactOverrides]);

  // LYD-57: sonido + notificacion del navegador cuando llega un mensaje
  // nuevo en cualquier conversacion. En modo mock no hay polling real, asi
  // que se desactiva (no tiene sentido alertar por datos de ejemplo).
  useEffect(() => {
    requestNotificationPermissionIfNeeded();
  }, []);
  useNewMessageAlerts(conversations, !isMockMode);

  // LYD-29: solo se abre el chat que el agente elige. Antes caia a conversations[0], y como abrir un chat con
  // mensajes sin leer lo marca como leido (LYD-13), entrar al inbox marcaba la primera conversacion como leida
  // sin que nadie la viera.
  const selectedConversation = conversations.find((c) => c.id === selectedConversationId) ?? null;

  const {
    data: realMessages = [],
    isLoading: realMessagesLoading,
    error: realMessagesError,
  } = useMessages(isMockMode ? null : selectedConversationId);
  const sendMessage = useSendMessage(selectedConversationId);
  const sendMedia = useSendMedia(selectedConversationId);
  const sendAudio = useSendAudio(selectedConversationId);
  const sendReaction = useSendReaction(selectedConversationId);
  const forwardMessage = useForwardMessage();
  const markConversationRead = useMarkConversationRead();
  const updateContact = useUpdateConversationContact();
  const loadOlderMessages = useLoadOlderMessages(selectedConversationId);

  // LYD-17: historial cargado a mano, acumulado por conversacion. Se resetea
  // al cambiar de chat -- cada conversacion arranca sin nada mas viejo cargado.
  // hasMoreOlder arranca en true (optimista): recien se sabe si hay mas de
  // 100 mensajes cuando se intenta cargar la pagina siguiente. El reset pasa
  // durante el render (patron "adjusting state when a prop changes" de React),
  // no en un efecto, para no encadenar un render extra.
  const [olderMessages, setOlderMessages] = useState<InboxMessage[]>([]);
  const [nextOlderPage, setNextOlderPage] = useState(2); // la pagina 1 ya la trae useMessages
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [olderMessagesKey, setOlderMessagesKey] = useState(selectedConversationId);
  if (olderMessagesKey !== selectedConversationId) {
    setOlderMessagesKey(selectedConversationId);
    setOlderMessages([]);
    setNextOlderPage(2);
    setHasMoreOlder(true);
  }

  const handleLoadOlder = async () => {
    if (isMockMode || selectedConversationId === null) return;
    const { messages, hasMore } = await loadOlderMessages.mutateAsync(nextOlderPage);
    setOlderMessages((prev) => [...messages, ...prev]);
    setNextOlderPage((p) => p + 1);
    setHasMoreOlder(hasMore);
  };

  const handleEditContact = (name: string, phone: string) => {
    if (selectedConversationId === null) return;
    if (isMockMode) {
      setMockContactOverrides((prev) => ({
        ...prev,
        [selectedConversationId]: { name, phone },
      }));
      return;
    }
    updateContact.mutate({
      conversationId: selectedConversationId,
      contactNameOverride: name,
      contactPhoneOverride: phone,
    });
  };

  // LYD-13: abrir un chat con mensajes sin leer lo marca como leido. Ademas
  // de al cambiar de conversacion, esto tiene que reaccionar a que el
  // contador suba mientras el chat ya esta abierto (llega un mensaje nuevo
  // en medio del polling de useConversations) -- si no, el badge quedaba
  // pegado hasta que el agente cerraba y volvia a abrir el chat.
  const selectedUnreadCount = selectedConversation?.unreadCount ?? 0;
  useEffect(() => {
    if (isMockMode || selectedConversationId === null) return;
    if (selectedUnreadCount > 0) {
      markConversationRead.mutate(selectedConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- markConversationRead cambia de identidad en cada render, no debe disparar el efecto por si sola
  }, [selectedConversationId, isMockMode, selectedUnreadCount]);

  const mockMessages = useMemo(
    () =>
      selectedConversationId === null
        ? []
        : [...getMockMessages(selectedConversationId), ...(mockDrafts[selectedConversationId] ?? [])],
    [selectedConversationId, mockDrafts],
  );

  // LYD-14: Composer espera una promesa que se rechaza si el envio falla,
  // para no borrar el texto ni perder el error en silencio.
  const handleSend = async (text: string, quoted?: ComposerQuoted) => {
    if (!isMockMode) {
      await sendMessage.mutateAsync(quoted ? { content: text, quoted } : text);
      return;
    }
    if (selectedConversationId === null) return;
    const draft: InboxMessage = {
      id: `draft-${Date.now()}`,
      direction: "outbound",
      text,
      sentAt: new Date().toISOString(),
      read: false,
      senderName: "Mafer",
      raw: { key: null, message: null },
      quotedPreview: null,
      reactions: [],
    };
    setMockDrafts((prev) => ({
      ...prev,
      [selectedConversationId]: [...(prev[selectedConversationId] ?? []), draft],
    }));
  };

  // LYD-15: en modo mock no hay a quien mandarle el archivo real -- se deja
  // un draft de texto describiendolo, igual que el resto del mock del inbox.
  const handleSendMedia = async (input: ComposerMediaInput) => {
    if (!isMockMode) {
      await sendMedia.mutateAsync(input);
      return;
    }
    if (selectedConversationId === null) return;
    const draft: InboxMessage = {
      id: `draft-${Date.now()}`,
      direction: "outbound",
      text: `[archivo adjunto: ${input.fileName ?? input.mediatype}]`,
      sentAt: new Date().toISOString(),
      read: false,
      senderName: "Mafer",
      raw: { key: null, message: null },
      quotedPreview: null,
      reactions: [],
    };
    setMockDrafts((prev) => ({
      ...prev,
      [selectedConversationId]: [...(prev[selectedConversationId] ?? []), draft],
    }));
  };

  // LYD-53: mismo criterio que handleSendMedia -- en mock queda un draft de
  // texto describiendolo, no hay a quien mandarle la nota de voz real.
  const handleSendAudio = async (input: ComposerAudioInput) => {
    if (!isMockMode) {
      await sendAudio.mutateAsync(input);
      return;
    }
    if (selectedConversationId === null) return;
    const draft: InboxMessage = {
      id: `draft-${Date.now()}`,
      direction: "outbound",
      text: "[nota de voz]",
      sentAt: new Date().toISOString(),
      read: false,
      senderName: "Mafer",
      raw: { key: null, message: null },
      quotedPreview: null,
      reactions: [],
    };
    setMockDrafts((prev) => ({
      ...prev,
      [selectedConversationId]: [...(prev[selectedConversationId] ?? []), draft],
    }));
  };

  // LYD-52: reaccionar/reenviar no tienen contraparte en modo mock (no hay
  // Chat real ni segunda conversacion de ejemplo con sentido) -- se ignoran
  // ahi, mismo criterio que el resto de las acciones de solo-lectura del mock.
  const handleReact = (message: InboxMessage, emoji: string) => {
    if (isMockMode) return;
    sendReaction.mutate({ key: message.raw.key, reaction: emoji });
  };

  const handleForward = (message: InboxMessage, targetConversationId: string) => {
    if (isMockMode) return;
    if (message.media) {
      // El adjunto original ya se resolvio a base64 al pintarse (LYD-15,
      // cacheado por messageId) -- pero forwardMessage no tiene acceso a ese
      // cache de React Query aca, asi que reenviar un adjunto pide primero
      // su base64 igual que hace MessageMedia.tsx.
      fetch("/api/lydia/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...message.media.raw,
          instanceName: selectedConversation?.instanceName,
        }),
      })
        .then((res) => res.json())
        .then((data: { dataUrl: string }) => {
          const base64 = data.dataUrl.slice(data.dataUrl.indexOf(",") + 1);
          forwardMessage.mutate({
            targetConversationId,
            text: "",
            media: {
              mediatype:
                message.media!.kind === "sticker"
                  ? "image"
                  : (message.media!.kind as "image" | "document" | "video" | "audio"),
              media: base64,
              mimetype: message.media!.mimetype,
              fileName: message.media!.fileName,
              caption: message.media!.caption,
            },
          });
        });
      return;
    }
    forwardMessage.mutate({ targetConversationId, text: message.text });
  };

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-bg text-ink">
      {isMockMode && (!LYDIA_API_ENABLED ? <MockModeBanner /> : error && <BackendDownBanner error={error} />)}
      <div className="flex flex-1 overflow-hidden">
        <div className={`${mobileView === "list" ? "flex" : "hidden"} w-full shrink-0 md:flex md:w-auto`}>
          <ConversationList
            conversations={conversations}
            isLoading={isMockMode ? false : isLoading}
            error={null}
            selectedConversationId={selectedConversationId}
            onSelect={(id) => {
              setSelectedConversationId(id);
              setFocusMessageId(null);
              setMobileView("thread");
            }}
            selectedMessageId={focusMessageId}
            messageSearchEnabled={!isMockMode}
            onSelectMessage={(conversationId, messageId) => {
              setSelectedConversationId(conversationId);
              setFocusMessageId(messageId);
              setMobileView("thread");
            }}
          />
        </div>

        {selectedConversation ? (
          <>
            <div className="hidden lg:flex">
              <LeadDetailPanel
                key={selectedConversation.id}
                conversation={selectedConversation}
                view={sidePanelView}
                onViewChange={setSidePanelView}
                agentRequestId={agentRequestId}
                onUseSuggestion={(text) => setInjectedText({ id: Date.now(), text })}
              />
            </div>
            <div className={`${mobileView === "thread" ? "flex" : "hidden"} w-full flex-1 md:flex`}>
              <ChatThread
                conversation={selectedConversation}
                thread={isMockMode ? mockMessages : [...olderMessages, ...realMessages]}
                isLoading={isMockMode ? false : realMessagesLoading}
                error={isMockMode ? null : realMessagesError}
                sending={!isMockMode && (sendMessage.isPending || sendMedia.isPending || sendAudio.isPending)}
                onSend={handleSend}
                onSendMedia={handleSendMedia}
                onSendAudio={handleSendAudio}
                onReact={handleReact}
                onForward={handleForward}
                onEditContact={handleEditContact}
                onLoadOlder={handleLoadOlder}
                loadingOlder={loadOlderMessages.isPending}
                hasMoreOlder={!isMockMode && hasMoreOlder && olderMessages.length + realMessages.length >= 100}
                focusMessageId={focusMessageId}
                onBack={() => setMobileView("list")}
                onAskAgent={() => {
                  setSidePanelView("agente");
                  setAgentRequestId((n) => n + 1);
                }}
                injectedText={injectedText}
              />
            </div>
          </>
        ) : (
          <div
            className={`${
              mobileView === "list" ? "hidden md:flex" : "flex"
            } flex-1 items-center justify-center text-sm text-muted`}
          >
            {isLoading && !isMockMode
              ? "Cargando conversaciones…"
              : conversations.length > 0
                ? "Selecciona una conversación para empezar."
                : "No hay conversaciones para mostrar."}
          </div>
        )}
      </div>
    </div>
  );
}
