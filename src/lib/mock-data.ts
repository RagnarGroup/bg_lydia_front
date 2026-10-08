import type {
  Agent,
  CalendarEvent,
  Conversation,
  IncomingRequest,
  Lead,
  Message,
  PipelineStage,
  TemplateGroup,
} from "./types";

export const pipelineStages: PipelineStage[] = [
  { id: "contacto_inicial", label: "Contacto Inicial", color: "bg-brand" },
  { id: "negociacion", label: "Negociación", color: "bg-accent" },
  { id: "promesa_pago", label: "Promesa de pago", color: "bg-violet-500" },
  { id: "discusion_contrato", label: "Discusión de contrato", color: "bg-cyan-500" },
  { id: "matriculado", label: "Matriculado", color: "bg-success" },
  { id: "venta_perdida", label: "Venta Perdida", color: "bg-danger" },
];

export const agents: Agent[] = [
  { id: "mafer", name: "Mafer", initials: "MF", color: "bg-brand" },
  { id: "bustamante", name: "Bustamante", initials: "BU", color: "bg-success" },
  { id: "centro", name: "Centro", initials: "CE", color: "bg-accent" },
  { id: "cayma", name: "Cayma", initials: "CA", color: "bg-violet-500" },
];

export const leads: Lead[] = [
  {
    id: "lead-1",
    code: "AS805",
    leadNumber: "#19834",
    contactName: "Lucas",
    company: "TikToks Ad (Mana)",
    phone: "+51 921 983 275",
    email: "",
    position: "",
    source: "TikToks Ad (Mana)",
    budget: "S/",
    budgetAmount: 0,
    stage: "promesa_pago",
    assignedAgentId: "mafer",
    createdAt: "2026-09-14T21:54:00-05:00",
    hasPendingTasks: false,
  },
  {
    id: "lead-2",
    code: "AS819",
    leadNumber: "#66792219",
    contactName: "Jony Leon Bernal Condo",
    source: "Facebook Ads",
    budgetAmount: 0,
    stage: "contacto_inicial",
    assignedAgentId: "mafer",
    createdAt: "2026-09-15T13:41:00-05:00",
    hasPendingTasks: false,
  },
  {
    id: "lead-3",
    code: "AS796",
    leadNumber: "#66777755",
    contactName: "Day Swwetie",
    source: "Instagram",
    budgetAmount: 0,
    stage: "negociacion",
    assignedAgentId: null,
    createdAt: "2026-09-14T17:59:00-05:00",
    hasPendingTasks: false,
  },
  {
    id: "lead-4",
    code: "AS790",
    leadNumber: "#66776745",
    contactName: "Referido",
    source: "Referido",
    budgetAmount: 0,
    stage: "contacto_inicial",
    assignedAgentId: null,
    createdAt: "2026-09-15T11:59:00-05:00",
    hasPendingTasks: false,
  },
  {
    id: "lead-5",
    code: "AS815",
    leadNumber: "#66782085",
    contactName: "Lu",
    source: "TikToks Ad (Mana)",
    budgetAmount: 0,
    stage: "discusion_contrato",
    assignedAgentId: "bustamante",
    createdAt: "2026-08-05T00:00:00-05:00",
    hasPendingTasks: false,
  },
  {
    id: "lead-6",
    code: "AS770",
    leadNumber: "#66770401",
    contactName: "Johan",
    source: "Google Ads",
    budgetAmount: 0,
    stage: "negociacion",
    assignedAgentId: "centro",
    createdAt: "2026-09-03T00:00:00-05:00",
    hasPendingTasks: false,
  },
  {
    id: "lead-7",
    code: "AS510",
    leadNumber: "#66761023",
    contactName: "Gerardo",
    source: "Facebook Ads",
    budgetAmount: 1490,
    stage: "matriculado",
    assignedAgentId: "cayma",
    createdAt: "2026-08-18T00:00:00-05:00",
    hasPendingTasks: false,
  },
  {
    id: "lead-8",
    code: "AS822",
    leadNumber: "#66812417",
    contactName: "Lidia Machaca",
    source: "TikToks Ad (Mana)",
    budgetAmount: 0,
    stage: "contacto_inicial",
    assignedAgentId: null,
    createdAt: "2026-09-15T13:41:00-05:00",
    hasPendingTasks: false,
  },
  {
    id: "lead-9",
    code: "AS823",
    leadNumber: "#66810701",
    contactName: "Maritza",
    source: "Facebook Ads",
    budgetAmount: 0,
    stage: "contacto_inicial",
    assignedAgentId: null,
    createdAt: "2026-09-15T12:44:00-05:00",
    hasPendingTasks: false,
  },
  {
    id: "lead-10",
    code: "AS824",
    leadNumber: "#66809097",
    contactName: "Dayi",
    source: "Instagram",
    budgetAmount: 0,
    stage: "contacto_inicial",
    assignedAgentId: "mafer",
    createdAt: "2026-09-15T11:59:00-05:00",
    hasPendingTasks: false,
  },
  {
    id: "lead-11",
    code: "AS825",
    leadNumber: "#66808371",
    contactName: "Rosario",
    source: "Referido",
    budgetAmount: 0,
    stage: "contacto_inicial",
    assignedAgentId: null,
    createdAt: "2026-09-15T11:39:00-05:00",
    hasPendingTasks: false,
  },
  {
    id: "lead-12",
    code: "AS610",
    leadNumber: "#66620819",
    contactName: "giovi",
    source: "Google Ads",
    budgetAmount: 0,
    stage: "negociacion",
    assignedAgentId: "centro",
    createdAt: "2026-09-04T00:00:00-05:00",
    hasPendingTasks: false,
  },
  {
    id: "lead-13",
    code: "AS611",
    leadNumber: "#66610727",
    contactName: "Ale",
    source: "Facebook Ads",
    budgetAmount: 0,
    stage: "negociacion",
    assignedAgentId: null,
    createdAt: "2026-09-03T00:00:00-05:00",
    hasPendingTasks: false,
  },
  {
    id: "lead-14",
    code: "AS612",
    leadNumber: "#66563447",
    contactName: "Steff",
    source: "TikToks Ad (Mana)",
    budgetAmount: 0,
    stage: "negociacion",
    assignedAgentId: "mafer",
    createdAt: "2026-09-02T00:00:00-05:00",
    hasPendingTasks: false,
  },
  {
    id: "lead-15",
    code: "AS613",
    leadNumber: "#66538923",
    contactName: "Milagros",
    source: "Instagram",
    budgetAmount: 0,
    stage: "negociacion",
    assignedAgentId: null,
    createdAt: "2026-09-01T00:00:00-05:00",
    hasPendingTasks: false,
  },
  {
    id: "lead-16",
    code: "AS410",
    leadNumber: "#66410131",
    contactName: "Katty paint",
    source: "TikTok Ads Manager lead",
    budgetAmount: 0,
    stage: "promesa_pago",
    assignedAgentId: "bustamante",
    createdAt: "2026-08-28T00:00:00-05:00",
    hasPendingTasks: false,
  },
  {
    id: "lead-17",
    code: "AS411",
    leadNumber: "#66327439",
    contactName: "Adrian Vadick",
    source: "Facebook Ads",
    budgetAmount: 0,
    stage: "promesa_pago",
    assignedAgentId: "bustamante",
    createdAt: "2026-08-26T00:00:00-05:00",
    hasPendingTasks: false,
  },
  {
    id: "lead-18",
    code: "AS412",
    leadNumber: "#66212575",
    contactName: "Miha ❤️🎉",
    source: "Instagram",
    budgetAmount: 0,
    stage: "promesa_pago",
    assignedAgentId: null,
    createdAt: "2026-08-23T00:00:00-05:00",
    hasPendingTasks: false,
  },
  {
    id: "lead-19",
    code: "AS610",
    leadNumber: "#65718361",
    contactName: "Yany",
    source: "Google Ads",
    budgetAmount: 0,
    stage: "discusion_contrato",
    assignedAgentId: "cayma",
    createdAt: "2026-08-05T00:00:00-05:00",
    hasPendingTasks: false,
  },
  {
    id: "lead-20",
    code: "AS340",
    leadNumber: "#65601147",
    contactName: "Brayan",
    source: "Referido",
    budgetAmount: 1290,
    stage: "matriculado",
    assignedAgentId: "centro",
    createdAt: "2026-08-12T00:00:00-05:00",
    hasPendingTasks: false,
  },
  {
    id: "lead-21",
    code: "AS201",
    leadNumber: "#65500932",
    contactName: "Ximena",
    source: "Facebook Ads",
    budgetAmount: 0,
    stage: "venta_perdida",
    assignedAgentId: "mafer",
    createdAt: "2026-08-10T00:00:00-05:00",
    hasPendingTasks: false,
  },
  {
    id: "lead-22",
    code: "AS202",
    leadNumber: "#65498211",
    contactName: "Renzo",
    source: "TikToks Ad (Mana)",
    budgetAmount: 0,
    stage: "venta_perdida",
    assignedAgentId: null,
    createdAt: "2026-08-08T00:00:00-05:00",
    hasPendingTasks: false,
  },
  {
    id: "lead-23",
    code: "AS703",
    leadNumber: "#66703105",
    contactName: "Clau",
    source: "Instagram",
    budgetAmount: 0,
    stage: "negociacion",
    assignedAgentId: "mafer",
    createdAt: "2026-09-15T13:03:00-05:00",
    hasPendingTasks: true,
  },
];

export const incomingRequests: IncomingRequest[] = [
  {
    id: "req-1",
    contactName: "Shirley Pacompia",
    receivedAt: "2026-09-15T13:35:00-05:00",
    tag: "Kids 7 a 11",
  },
  {
    id: "req-2",
    contactName: "Fiesticar Eventos",
    receivedAt: "2026-09-15T08:50:00-05:00",
    preview: "¡Hola! 🤖 Quisiera conversar con...",
  },
  {
    id: "req-3",
    contactName: "Manuel",
    receivedAt: "2026-09-15T06:11:00-05:00",
    tag: "Adultos 18 a más",
  },
  {
    id: "req-4",
    contactName: "C",
    receivedAt: "2026-09-15T00:42:00-05:00",
    preview: "¡Hola! 🤖 Quisiera conversar con...",
  },
  {
    id: "req-5",
    contactName: "Melba",
    receivedAt: "2026-09-14T23:09:00-05:00",
    preview: "¡Hola! 🤖 Quisiera conversar con...",
  },
  {
    id: "req-6",
    contactName: "Alva Hg",
    receivedAt: "2026-09-14T22:46:00-05:00",
    preview: "Buenas noches, quería consultar...",
  },
];

export const conversations: Conversation[] = [
  {
    id: "conv-1",
    leadId: "lead-1",
    lastMessagePreview: "Ok gracias por la información",
    lastMessageAt: "2026-09-15T10:20:00-05:00",
    unread: false,
    starred: true,
    assignedAgentId: "mafer",
    status: "abierto",
  },
  {
    id: "conv-2",
    leadId: "lead-2",
    lastMessagePreview: "Tú: 💬 ¡Hola Jony! Soy Mafer de Brittany Group 😊 ...",
    lastMessageAt: "2026-09-15T09:36:00-05:00",
    unread: false,
    starred: false,
    assignedAgentId: "mafer",
    status: "sin_respuesta",
  },
  {
    id: "conv-3",
    leadId: "lead-3",
    lastMessagePreview: "Tú: 💬 ¡Hola! Soy Mafer de Brittany Group 😊 Para ...",
    lastMessageAt: "2026-09-15T09:41:00-05:00",
    unread: true,
    starred: false,
    assignedAgentId: null,
    status: "sin_respuesta",
  },
  {
    id: "conv-4",
    leadId: "lead-4",
    lastMessagePreview: "Tú: 💬 ¡Hola! Soy Mafer de Brittany Group 😊 Para ...",
    lastMessageAt: "2026-09-15T09:42:00-05:00",
    unread: false,
    starred: false,
    assignedAgentId: null,
    status: "sin_respuesta",
  },
  {
    id: "conv-5",
    leadId: "lead-5",
    lastMessagePreview: "Tú: Estos son los costos Lu 📄 Matrícula: S/ 80 (pag...",
    lastMessageAt: "2026-09-15T09:52:00-05:00",
    unread: false,
    starred: false,
    assignedAgentId: "bustamante",
    status: "abierto",
  },
  {
    id: "conv-6",
    leadId: "lead-6",
    lastMessagePreview: "Tú: mínimo 3 máximo 9 por aula, son grupos person...",
    lastMessageAt: "2026-09-15T09:12:00-05:00",
    unread: false,
    starred: false,
    assignedAgentId: "centro",
    status: "abierto",
  },
  {
    id: "conv-7",
    leadId: "lead-7",
    lastMessagePreview: "Tú: ¡Felicitaciones por tu matrícula! 🎉",
    lastMessageAt: "2026-09-14T18:05:00-05:00",
    unread: false,
    starred: false,
    assignedAgentId: "cayma",
    status: "cerrado",
  },
];

export const messages: Message[] = [
  {
    id: "msg-1",
    conversationId: "conv-1",
    direction: "inbound",
    text: "Disculpe cuales son los horarios que tienen?",
    sentAt: "2026-09-14T21:54:00-05:00",
  },
  {
    id: "msg-2",
    conversationId: "conv-1",
    direction: "inbound",
    text: "Y cual es el precio de la mensualidad?",
    sentAt: "2026-09-14T21:54:00-05:00",
  },
  {
    id: "msg-3",
    conversationId: "conv-1",
    direction: "system",
    text: "Hoy 10:12 · Mafer cambió el usuario responsable: de Brittany Miraflores a Mafer",
    sentAt: "2026-09-15T10:12:00-05:00",
  },
  {
    id: "msg-4",
    conversationId: "conv-1",
    direction: "outbound",
    senderName: "Mafer",
    text: "¡Hola, Lucas! Soy Mafer de Brittany Group 😊\n\nPara Teens de 12 a 17 años, nuestro programa de inglés dura 18 meses, dividido en 3 niveles:\n\n🔵 Básico: 6 meses\n🟢 Intermedio: 6 meses\n🔴 Avanzado: 6 meses\n\n🕐 Horarios de lunes a viernes:\n• 7:15 a.m. – 8:45 a.m.\n• 9:00 a.m. – 10:30 a.m.\n• 10:45 a.m. – 12:15 p.m.\n• 12:30 p.m. – 2:00 p.m.\n• 2:10 p.m. – 3:40 p.m.\n• 3:50 p.m. – 5:20 p.m.\n• 5:30 p.m. – 7:00 p.m.\n• 7:15 p.m. – 8:45 p.m.\n\n📅 Horarios sabatinos:\n• 9:00 a.m. – 2:00 p.m.\n• 2:30 p.m. – 7:30 p.m.\n\n📍 Sede Miraflores: Av. Benavides 330, Miraflores",
    sentAt: "2026-09-15T10:20:00-05:00",
    read: true,
  },
];

export const templateGroups: TemplateGroup[] = [
  {
    id: "plantillas",
    title: "PLANTILLAS",
    templates: [
      {
        command: "/Precios adultos",
        label: "Precios adultos",
        body: "¡Hola! 😊 Para adultos manejamos estos precios:\n\n💳 Matrícula: S/ 80 (pago único)\n💰 Mensualidad: S/ 250\n\n📚 Incluye material digital y acceso a la plataforma de práctica.\n\n¿Querés que te cuente los horarios disponibles?",
      },
      {
        command: "/Prekids",
        label: "Prekids",
        body: "¡Hola! 😊 Prekids es nuestro programa para niños de 4 a 6 años.\n\n🎨 Clases lúdicas de 45 minutos, grupos de máximo 8 niños.\n📅 2 veces por semana.\n💰 Mensualidad: S/ 180\n\n¿Te gustaría agendar una clase de prueba gratuita?",
      },
      {
        command: "/Sedes",
        label: "Sedes",
        body: "Estas son nuestras sedes 📍\n\n• Miraflores: Av. Benavides 330\n• Cayma (Arequipa): Av. Ejército 710\n• Centro (Arequipa): Calle Mercaderes 145\n\n¿Cuál te queda más cerca?",
      },
      {
        command: "/British Council",
        label: "British Council",
        body: "El examen del British Council certifica tu nivel de inglés internacionalmente 🇬🇧\n\nNosotros te preparamos con simulacros y práctica de las 4 habilidades (listening, reading, writing, speaking).\n\n¿En qué nivel estás actualmente?",
      },
      {
        command: "/Teens",
        label: "Teens",
        body: "Para Teens de 12 a 17 años, nuestro programa dura 18 meses, dividido en 3 niveles:\n\n🔵 Básico: 6 meses\n🟢 Intermedio: 6 meses\n🔴 Avanzado: 6 meses\n\n¿Querés que te pase los horarios disponibles?",
      },
      {
        command: "/Costos",
        label: "Costos",
        body: "Estos son los costos 📄\n\n💳 Matrícula: S/ 80 (pago único)\n💰 Mensualidad: desde S/ 180 según el programa\n\n¿Para qué programa querías la cotización?",
      },
    ],
  },
];

export const calendarEvents: CalendarEvent[] = [
  {
    id: "event-1",
    type: "tarea",
    leadId: "lead-23",
    agentId: "mafer",
    startAt: "2026-09-15T13:03:00-05:00",
    endAt: "2026-09-15T13:33:00-05:00",
    note: "hacer seguimiento mandarle el inicio",
  },
  {
    id: "event-2",
    type: "tarea",
    leadId: "lead-1",
    agentId: "mafer",
    startAt: "2026-09-15T16:00:00-05:00",
    endAt: "2026-09-15T16:30:00-05:00",
    note: "Llamada de seguimiento sobre horarios",
  },
  {
    id: "event-3",
    type: "reserva",
    leadId: "lead-5",
    agentId: "bustamante",
    startAt: "2026-09-16T10:00:00-05:00",
    endAt: "2026-09-16T10:30:00-05:00",
    note: "Confirmar matrícula",
  },
];

export function getLeadByConversationId(conversationId: string): Lead | undefined {
  const conversation = conversations.find((c) => c.id === conversationId);
  if (!conversation) return undefined;
  return leads.find((l) => l.id === conversation.leadId);
}

export function getLeadById(leadId: string): Lead | undefined {
  return leads.find((l) => l.id === leadId);
}

export function getMessagesByConversationId(conversationId: string): Message[] {
  return messages
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
}

export function getAgentById(agentId: string | null): Agent | undefined {
  if (!agentId) return undefined;
  return agents.find((a) => a.id === agentId);
}

export function getLeadsByStage(leadList: Lead[], stageId: Lead["stage"]): Lead[] {
  return leadList.filter((lead) => lead.stage === stageId);
}

export function sumBudget(leadList: Lead[]): number {
  return leadList.reduce((total, lead) => total + lead.budgetAmount, 0);
}

/**
 * Snapshot estático para el panel de Insights: mensajes por canal y tiempos
 * de respuesta no tienen modelo de datos real todavia (harian falta eventos
 * de mensajeria con timestamps, que esta maqueta no modela) — son valores de
 * referencia, no calculados. El resto de las metricas del panel SI se derivan
 * en vivo de `leads`/`conversations`/`calendarEvents`.
 */
export const insightsSnapshot = {
  mensajesEntrantes: {
    total: 62,
    canales: [
      { label: "WhatsApp Cloud API", value: 58 },
      { label: "Tiktok", value: 4 },
      { label: "Instagram", value: 0 },
      { label: "Chats", value: 0 },
      { label: "Otros", value: 0 },
    ],
  },
  lapsoMedioRespuesta: "6m",
  lapsoMayorRespuesta: "42m",
  deltasPorSemana: {
    dialogosVigentes: -3,
    dialogosSinReplica: 2,
    leadsActivos: 5,
    tareas: 1,
    leadsGanados: 0,
    mensajesEntrantes: 9,
  },
};

// Orden fijo de colores por fuente (nunca se reordena aunque cambie el ranking
// por conteo) — mismos hex del tema categorico oscuro validado con
// scripts/validate_palette.js de la skill dataviz contra el fondo #0b1a33.
const SOURCE_COLOR_ORDER: { source: string; hex: string }[] = [
  { source: "Facebook Ads", hex: "#3987e5" },
  { source: "Instagram", hex: "#d95926" },
  { source: "TikToks Ad (Mana)", hex: "#199e70" },
  { source: "Google Ads", hex: "#c98500" },
  { source: "Referido", hex: "#d55181" },
  { source: "TikTok Ads Manager lead", hex: "#008300" },
];

export function getLeadSourceBreakdown(leadList: Lead[]) {
  const counts = new Map<string, number>();
  for (const lead of leadList) {
    counts.set(lead.source, (counts.get(lead.source) ?? 0) + 1);
  }
  return SOURCE_COLOR_ORDER.map(({ source, hex }) => ({ source, hex, count: counts.get(source) ?? 0 }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);
}
