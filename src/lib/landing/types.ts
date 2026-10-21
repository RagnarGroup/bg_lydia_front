import type { LeadStage } from "@/lib/lydia-api/types";

// LYD-84: contrato de /crm/landing-leads (lydia_bg_back, LYD-83). Tipos sin
// "server-only" porque los comparten el cliente (hooks/UI) y el servidor.

export const LANDING_SEDES = ["Bustamante", "Centro", "Cayma", "Lince", "Miraflores"] as const;
export type LandingSede = (typeof LANDING_SEDES)[number];

export const VISIT_STATUSES = [
  "solicitada",
  "confirmada",
  "reprogramada",
  "asistio",
  "no_asistio",
  "cancelada",
] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

export interface LandingAgentRef {
  id: string;
  name: string;
  color: string;
}

// LYD-100: "consulta" = lead de una landing sin visita a sede (Spanish
// Immersion): sin sede, ciudad, fecha ni estado de visita; se identifica por el correo.
export type LandingLeadTipo = "visita" | "consulta";

// Valor del filtro de sede que muestra solo las consultas (no es una sede real).
export const CONSULTAS_FILTER = "consultas";

export interface LandingLead {
  id: string;
  leadNumber: string;
  contactName: string;
  phone: string | null;
  email: string | null;
  sede: string | null;
  ciudad: string | null;
  programa: string;
  tipo: LandingLeadTipo;
  tags: string[];
  visitAt: string | null;
  visitStatus: VisitStatus | null;
  stage: LeadStage;
  assignedAgent: LandingAgentRef | null;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
}

export type LandingActivityType =
  "creado" | "tomado" | "liberado" | "estado_visita" | "reprogramada" | "nota" | "etapa" | "consulta";

// LYD-100: datos de una consulta (meta.detalle del historial).
export interface ConsultaDetalle {
  opcion?: string;
  precio?: string;
  mesInicio?: string;
  pais?: string;
  nivel?: string;
}

export interface LandingActivity {
  id: string;
  type: LandingActivityType;
  content: string | null;
  meta: {
    from?: string | null;
    to?: string | null;
    auto?: boolean;
    tipo?: string;
    detalle?: ConsultaDetalle;
  } | null;
  createdAt: string;
  agent: { id: string; name: string } | null;
}

export interface LandingCalendarEvent {
  id: string;
  startAt: string;
  endAt: string;
  completed: boolean;
  note: string | null;
}

export interface LandingLeadDetail extends LandingLead {
  observations: string | null;
  attribution: Record<string, string> | null;
  activities: LandingActivity[];
  calendarEvents: LandingCalendarEvent[];
}

export interface LandingSummary {
  unclaimed: number;
  bySede: Record<string, { unclaimed: number; total: number }>;
  // LYD-100: consultas sin sede (el back viejo no lo manda).
  consultas?: { unclaimed: number; total: number };
}

export interface LandingLeadFilters {
  sede?: string;
  visitStatus?: VisitStatus;
  from?: string;
  to?: string;
  unclaimed?: boolean;
  search?: string;
  tipo?: LandingLeadTipo;
}

export interface LandingVisitInput {
  status: VisitStatus;
  visitAt?: string;
  note?: string;
}
