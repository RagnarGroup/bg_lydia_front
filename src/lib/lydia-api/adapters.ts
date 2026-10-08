import type {
  EvoAgent,
  EvoCalendarEvent,
  EvoConversation,
  EvoLead,
  EvoMessage,
  EvoMessageSearchHit,
  EvoNote,
  EvoPersonalInsights,
  EvoTemplateGroup,
} from "./types";
import type {
  InboxAgent,
  InboxContact,
  InboxConversation,
  InboxMediaKind,
  InboxMessage,
  InboxMessageMedia,
  InboxMessageReaction,
  InboxMessageSearchHit,
  InboxNote,
} from "./inbox-types";
import type { CalendarEvent, Lead, TemplateGroup } from "@/lib/types";

function jidToPhone(remoteJid: string): string {
  return remoteJid.split("@")[0] ?? remoteJid;
}

// LYD-31: canal a partir de la integracion de la instancia (ver Integration
// en wa.types.ts del back). Los dos tipos de instancia de WhatsApp caen en
// el mismo canal para el inbox -- la distincion Baileys/Cloud API no le
// importa al agente.
export function channelFromIntegration(integration: string): InboxConversation["inboxChannel"] {
  if (integration === "FACEBOOK-MESSENGER") return "messenger";
  if (integration === "INSTAGRAM") return "instagram";
  return "whatsapp";
}

// LYD-60: Pick en vez de EvoConversation entero para poder reusarlo con los
// resultados de busqueda de mensajes (adaptMessageSearchHit), que traen los
// mismos campos del chat/contacto pero no la conversacion completa.
type ContactSource = Pick<
  EvoConversation,
  "contact" | "integration" | "remoteJid" | "contactNameOverride" | "contactPhoneOverride" | "name"
>;

export function adaptContact(conversation: ContactSource): InboxContact {
  const contact = conversation.contact;
  const channel = channelFromIntegration(conversation.integration);
  // LYD-31: el remoteJid de Messenger/Instagram es un id de usuario de Meta
  // (PSID/IGSID), no un telefono -- mostrarlo como "Telefono" confundia al
  // agente. Solo WhatsApp tiene telefono real en el jid.
  const phoneFromJid = channel === "whatsapp" ? jidToPhone(conversation.remoteJid) : null;
  return {
    lydiaContactId: contact?.id ?? conversation.remoteJid,
    // LYD-14: el override manual (Chat.contactNameOverride) gana siempre que
    // este seteado -- WhatsApp puede estar mandando un nickname/tag en vez
    // del nombre real, o directamente nada.
    name:
      conversation.contactNameOverride ||
      contact?.pushName ||
      conversation.name ||
      phoneFromJid ||
      jidToPhone(conversation.remoteJid),
    email: null, // ninguno de los tres canales expone email de contacto
    phone: conversation.contactPhoneOverride || phoneFromJid,
    avatarUrl: contact?.profilePicUrl || "",
  };
}

export function adaptAgent(agent: EvoAgent): InboxAgent {
  return {
    id: agent.id,
    name: agent.name,
    avatarUrl: "",
    role: agent.role,
  };
}

export function adaptNote(note: EvoNote): InboxNote {
  return {
    id: note.id,
    content: note.content,
    createdAt: note.createdAt,
    authorName: note.Agent?.name ?? null,
  };
}

function messageText(message: EvoMessage["message"]): string {
  return message?.conversation ?? message?.extendedTextMessage?.text ?? "";
}

// LYD-15: mapa de los campos de media crudos de WhatsApp/Baileys a los tipos
// que puede renderizar MessageBubble. El base64 no se resuelve aca -- se
// pide bajo demanda (ver client.ts getMediaBase64) para no cargar cada poll
// de listMessages con blobs pesados.
const MEDIA_KIND_BY_KEY: Record<string, InboxMediaKind> = {
  imageMessage: "image",
  videoMessage: "video",
  audioMessage: "audio",
  documentMessage: "document",
  stickerMessage: "sticker",
};

function detectMedia(raw: EvoMessage): InboxMessageMedia | undefined {
  for (const [key, kind] of Object.entries(MEDIA_KIND_BY_KEY)) {
    const payload = raw.message?.[key] as
      | { caption?: string; fileName?: string; mimetype?: string }
      | undefined;
    if (payload) {
      return {
        kind,
        caption: payload.caption,
        fileName: payload.fileName,
        mimetype: payload.mimetype,
        // messageType = el nombre del campo que matcheo (ej "audioMessage")
        // -- es exactamente lo que getBase64FromMediaMessage necesita del
        // lado del back para saber donde mirar dentro de `message`.
        raw: { key: raw.key, message: raw.message, messageType: key },
      };
    }
  }
  return undefined;
}

// LYD-52: snippet corto del mensaje citado (si `message` es una respuesta a
// otro), para pintar la franja de "responder a" arriba de la burbuja.
function quotedPreview(message: EvoMessage["message"]): string | null {
  const quoted = message.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!quoted) return null;
  return messageText(quoted) || "Adjunto";
}

export function adaptMessage(message: EvoMessage, reactions: InboxMessageReaction[] = []): InboxMessage {
  const direction: InboxMessage["direction"] = message.key.fromMe ? "outbound" : "inbound";
  const lastStatus = message.MessageUpdate?.[message.MessageUpdate.length - 1]?.status;
  const media = detectMedia(message);

  return {
    id: message.id,
    direction,
    text: media ? (media.caption ?? "") : messageText(message.message),
    sentAt: new Date(message.messageTimestamp * 1000).toISOString(),
    read: lastStatus === "READ" || lastStatus === "read",
    senderName: message.pushName ?? undefined,
    media,
    raw: { key: message.key, message: message.message },
    quotedPreview: quotedPreview(message.message),
    reactions,
  };
}

// LYD-52: WhatsApp manda cada reaccion como su propio registro de mensaje
// (messageType reactionMessage), apuntando al key del mensaje reaccionado --
// no encaja como un InboxMessage mas en el hilo. Esto los saca de la lista y
// arma un mapa id-del-mensaje-original -> reacciones, para que adaptMessage
// se las adjunte al pasar.
export function foldReactions(records: EvoMessage[]): { records: EvoMessage[]; reactionsByMessageId: Map<string, InboxMessageReaction[]> } {
  const reactionsByMessageId = new Map<string, InboxMessageReaction[]>();
  const rest: EvoMessage[] = [];

  for (const record of records) {
    const reaction = record.message?.reactionMessage;
    if (reaction) {
      const targetId = reaction.key.id;
      const list = reactionsByMessageId.get(targetId) ?? [];
      // Un remitente solo tiene una reaccion activa a la vez -- la nueva
      // reemplaza la anterior, y texto vacio significa que la saco.
      const withoutSameSender = list.filter((r) => r.fromMe !== record.key.fromMe);
      if (reaction.text) withoutSameSender.push({ emoji: reaction.text, fromMe: record.key.fromMe });
      reactionsByMessageId.set(targetId, withoutSameSender);
      continue;
    }
    rest.push(record);
  }

  return { records: rest, reactionsByMessageId };
}

/**
 * "sin_respuesta" no es un status nativo de Evolution -- es una lectura de
 * negocio: conversacion abierta con mensajes del contacto sin leer.
 * "cerrado" cubre resolved; pending cae en "abierto" por ahora (no hay un
 * concepto de Lydia para eso todavia).
 */
function deriveStatus(conversation: EvoConversation): InboxConversation["status"] {
  if (conversation.status === "resolved") return "cerrado";
  if (conversation.status === "open" && conversation.unreadMessages > 0) return "sin_respuesta";
  return "abierto";
}

// LYD-8: el back linkea Lead -> Chat (lead.chatId), al reves de como el mock
// del frontend linkea Conversation -> Lead (conversation.leadId). Este
// adapter expone el shape del frontend (Lead sin conversationId propio, la
// UI de pipeline no necesita el link inverso).
export function adaptLead(lead: EvoLead): Lead {
  return {
    id: lead.id,
    code: lead.leadNumber,
    leadNumber: lead.leadNumber,
    contactName: lead.contactName,
    company: lead.company ?? undefined,
    phone: lead.phone ?? undefined,
    email: lead.email ?? undefined,
    position: lead.position ?? undefined,
    source: lead.source,
    budget: lead.budget ?? undefined,
    budgetAmount: Number(lead.budgetAmount),
    stage: lead.stage,
    assignedAgentId: lead.assignedAgentId,
    createdAt: lead.createdAt,
    hasPendingTasks: lead.hasPendingTasks,
  };
}

export function adaptCalendarEvent(event: EvoCalendarEvent): CalendarEvent {
  return {
    id: event.id,
    type: event.type,
    leadId: event.leadId ?? undefined,
    agentId: event.agentId,
    startAt: event.startAt,
    endAt: event.endAt,
    note: event.note,
    completed: event.completed,
  };
}

export function adaptTemplateGroup(group: EvoTemplateGroup): TemplateGroup {
  return {
    id: group.id,
    title: group.title,
    templates: group.Templates.map((t) => ({ id: t.id, command: t.command, label: t.label, body: t.body })),
  };
}

// Pass-through casi directo -- el shape de EvoPersonalInsights ya se disenio
// igual al que espera PersonalDashboard.tsx (ver LYD-11).
export function adaptPersonalInsights(insights: EvoPersonalInsights): EvoPersonalInsights {
  return insights;
}

// LYD-60: mismo criterio de nombre/avatar que la lista de conversaciones
// (adaptContact), asi el contacto se ve igual en "Contactos" y en "Mensajes".
export function adaptMessageSearchHit(hit: EvoMessageSearchHit): InboxMessageSearchHit {
  const contact = adaptContact({
    contact: {
      id: hit.remoteJid,
      remoteJid: hit.remoteJid,
      pushName: hit.contactPushName,
      profilePicUrl: hit.profilePicUrl,
    },
    integration: hit.integration,
    remoteJid: hit.remoteJid,
    contactNameOverride: hit.contactNameOverride,
    contactPhoneOverride: hit.contactPhoneOverride,
    name: hit.chatName,
  });
  return {
    messageId: hit.messageId,
    conversationId: hit.chatId,
    contactName: contact.name,
    avatarUrl: contact.avatarUrl,
    snippet: hit.snippet,
    sentAt: new Date(hit.timestamp * 1000).toISOString(),
    fromMe: hit.fromMe,
    inboxChannel: channelFromIntegration(hit.integration),
  };
}

export function adaptConversation(conversation: EvoConversation): InboxConversation {
  return {
    id: conversation.id,
    remoteJid: conversation.remoteJid,
    // LYD-31: de que instancia es, para pedir mensajes/mandar por el canal correcto.
    instanceName: conversation.instanceName,
    contact: adaptContact(conversation),
    assignee: conversation.Agent ? adaptAgent(conversation.Agent) : undefined,
    status: deriveStatus(conversation),
    lastMessagePreview: conversation.lastMessage?.content ?? "",
    lastMessageAt: conversation.lastMessage
      ? new Date(conversation.lastMessage.timestamp * 1000).toISOString()
      : conversation.updatedAt,
    unreadCount: conversation.unreadMessages,
    inboxChannel: channelFromIntegration(conversation.integration),
    agentTags: conversation.agentTags ?? {},
  };
}
