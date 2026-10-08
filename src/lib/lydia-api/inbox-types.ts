/**
 * Tipos "adaptados" para el inbox real (a diferencia de los tipos mock en
 * @/lib/types, que siguen alimentando Pipelines/Calendario/Automatizaciones/
 * Insights). No tienen stage/budget porque el backend no los modela todavia
 * -- sigue pendiente (ver CRM-9, CRM-12).
 */

export interface InboxAgent {
  id: string;
  name: string;
  avatarUrl: string;
  role?: "asesor" | "administrador";
}

export interface InboxContact {
  lydiaContactId: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string;
}

export type InboxMessageDirection = "inbound" | "outbound" | "system";

export type InboxMediaKind = "image" | "video" | "audio" | "document" | "sticker";

export interface InboxMessageMedia {
  kind: InboxMediaKind;
  caption?: string;
  fileName?: string;
  mimetype?: string;
  // Datos crudos necesarios para pedirle a Evolution API el base64 bajo
  // demanda (LYD-15) -- no se resuelve al listar mensajes para no cargar
  // cada poll con blobs pesados, solo cuando el bubble lo pide.
  // messageType (LYD-53 fix): el canal WhatsApp Business/Cloud API de
  // getBase64FromMediaMessage necesita saber a que campo de `message` mirar
  // (`audioMessage`, `imageMessage`, etc) -- sin esto tira TypeError server-
  // side ("No se pudo cargar el archivo") para CUALQUIER adjunto, entrante o
  // saliente. Bug preexistente a LYD-53, recien detectado con notas de voz.
  raw: { key: unknown; message: unknown; messageType: string };
}

// LYD-52: reaccion agregada sobre un mensaje. WhatsApp la manda como un
// mensaje aparte (messageType reactionMessage) apuntando al key del original
// -- el fold pasa en listMessages (client.ts), aca ya llega adjunta.
export interface InboxMessageReaction {
  emoji: string;
  fromMe: boolean;
}

export interface InboxNote {
  id: string;
  content: string;
  createdAt: string;
  authorName: string | null;
}

export interface InboxMessage {
  id: string;
  direction: InboxMessageDirection;
  text: string;
  sentAt: string; // ISO
  read: boolean;
  senderName?: string;
  media?: InboxMessageMedia;
  // LYD-52: key + message crudo de Evolution API, para citar/reaccionar a
  // este mensaje puntual (antes solo vivia dentro de `media`, para pedir el
  // base64 -- ahora hace falta en todos, tengan adjunto o no).
  raw: { key: unknown; message: unknown };
  // LYD-52: snippet corto del mensaje citado, si este es una respuesta a otro.
  quotedPreview: string | null;
  reactions: InboxMessageReaction[];
}

// LYD-60: resultado de la busqueda contextual dentro de los mensajes
// (GET /crm/conversations/search del back), ya adaptado para la lista.
export interface InboxMessageSearchHit {
  messageId: string; // Message.id -- el mismo que InboxMessage.id en el hilo
  conversationId: string; // Chat.id
  contactName: string;
  avatarUrl: string;
  snippet: string;
  sentAt: string; // ISO
  fromMe: boolean;
  inboxChannel: InboxChannel;
}

export type InboxConversationStatus = "abierto" | "sin_respuesta" | "cerrado";

// LYD-31: los tres canales que hoy conecta lydia_bg_back (ver Integration en
// wa.types.ts del back). "whatsapp" cubre tanto Baileys como Cloud API.
export type InboxChannel = "whatsapp" | "messenger" | "instagram";

export interface InboxConversation {
  id: string; // Chat.id (cuid) en lydia_bg_back
  remoteJid?: string; // ausente en datos de ejemplo (mock-fallback)
  // LYD-31: instancia/canal de esta conversacion puntual -- ausente en mock.
  // Necesaria para pedir mensajes y enviar contra el canal correcto.
  instanceName?: string;
  contact: InboxContact;
  assignee?: InboxAgent;
  status: InboxConversationStatus;
  lastMessagePreview: string;
  lastMessageAt: string; // ISO
  unreadCount: number;
  inboxChannel: InboxChannel;
  // LYD-74: etiquetas del agente IA por grupo (ver TAG_GROUPS en AgentAssistantPanel).
  agentTags?: Record<string, string>;
}

// LYD-74: una linea del chat de la asesora con el agente IA.
export interface AgentChatLine {
  role: "asesora" | "ia";
  text: string;
}

export interface AgentChatResult {
  reply: string;
  suggestion: string | null;
  tags: Record<string, string>;
}
