export type PipelineStageId =
  "contacto_inicial" | "negociacion" | "promesa_pago" | "discusion_contrato" | "matriculado" | "venta_perdida";

export interface PipelineStage {
  id: PipelineStageId;
  label: string;
  color: string; // tailwind bg class
}

export type ConversationFilter = "chats_abiertos" | "sin_respuesta" | "asignado_a_mi" | "suscrito" | "destacados";

export interface Agent {
  id: string;
  name: string;
  initials: string;
  color: string;
}

export interface Lead {
  id: string;
  code: string; // ej. AS805
  leadNumber: string; // ej. #19834
  contactName: string;
  company?: string;
  phone?: string;
  email?: string;
  position?: string;
  source: string; // medio por donde llegó
  budget?: string;
  budgetAmount: number; // en soles, para sumar en el pipeline
  stage: PipelineStageId;
  assignedAgentId: string | null;
  createdAt: string; // ISO, fecha en que entró a su etapa actual
  hasPendingTasks: boolean;
  chatId?: string; // LYD-20: link opcional a la conversacion de WhatsApp (Chat)
}

export type MessageDirection = "inbound" | "outbound" | "system";

export interface Message {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  text: string;
  sentAt: string; // ISO
  read?: boolean;
  senderName?: string;
}

export interface Conversation {
  id: string;
  leadId: string;
  lastMessagePreview: string;
  lastMessageAt: string; // ISO
  unread: boolean;
  starred: boolean;
  assignedAgentId: string | null;
  status: "abierto" | "sin_respuesta" | "cerrado";
}

export interface TemplateGroup {
  id: string;
  title: string;
  templates: { id?: string; command: string; label: string; body: string }[]; // id ausente solo en datos mock
}

export interface IncomingRequest {
  id: string;
  contactName: string;
  receivedAt: string; // ISO
  tag?: string; // etiqueta corta, ej. "Kids 7 a 11"
  preview?: string; // texto del primer mensaje, si no tiene etiqueta
}

export type CalendarEventType = "chat" | "nota" | "tarea" | "reserva";

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  leadId?: string; // ausente = recordatorio general, sin lead asociado
  agentId: string | null;
  startAt: string; // ISO
  endAt: string; // ISO
  note: string;
  // LYD-9: solo aplica a type "tarea" -- distingue pendiente de resuelta.
  // Opcional/default false para no romper los mocks existentes que no lo seteaban.
  completed?: boolean;
}
