/**
 * Datos de ejemplo para el inbox cuando el backend de Lydia todavía no está
 * configurado (EVOLUTION_API_URL/KEY/INSTANCE_NAME ausentes, o no hay un
 * numero de WhatsApp conectado todavia) — así se puede seguir viendo el
 * diseño sin depender de una instancia real. Se arman a partir de los
 * mismos leads/conversaciones/mensajes de mock-data.ts que usan
 * Pipelines/Calendario, adaptados a la forma InboxConversation/InboxMessage
 * para que ConversationList/ChatThread/LeadDetailPanel no necesiten saber
 * si el dato es real o de muestra.
 */
import { conversations, getAgentById, getLeadByConversationId, getMessagesByConversationId } from "@/lib/mock-data";
import type { InboxConversation, InboxMessage } from "./inbox-types";

const idByMockConversationId = new Map(conversations.map((c, i) => [c.id, `mock-${i + 1}`]));

export const mockInboxConversations: InboxConversation[] = conversations
  .map((conversation) => {
    const lead = getLeadByConversationId(conversation.id);
    if (!lead) return null;
    const agent = getAgentById(conversation.assignedAgentId);
    const id = idByMockConversationId.get(conversation.id)!;

    const entry: InboxConversation = {
      id,
      contact: {
        lydiaContactId: id,
        name: lead.contactName,
        email: lead.email || null,
        phone: lead.phone || null,
        avatarUrl: "",
      },
      assignee: agent ? { id: "mock-agent", name: agent.name, avatarUrl: "" } : undefined,
      status: conversation.status,
      lastMessagePreview: conversation.lastMessagePreview,
      lastMessageAt: conversation.lastMessageAt,
      unreadCount: conversation.unread ? 1 : 0,
      inboxChannel: "whatsapp",
    };
    return entry;
  })
  .filter((c): c is InboxConversation => c !== null);

export function getMockMessages(conversationId: string): InboxMessage[] {
  const mockConversationId = [...idByMockConversationId.entries()].find(([, v]) => v === conversationId)?.[0];
  if (!mockConversationId) return [];

  return getMessagesByConversationId(mockConversationId).map((message, i) => ({
    id: `mock-${i + 1}`,
    direction: message.direction,
    text: message.text,
    sentAt: message.sentAt,
    read: message.read ?? false,
    senderName: message.senderName,
    // LYD-52: sin key/message real que citar en modo mock -- responder/
    // reenviar/reaccionar quedan deshabilitados ahi (ver InboxView).
    raw: { key: null, message: null },
    quotedPreview: null,
    reactions: [],
  }));
}
