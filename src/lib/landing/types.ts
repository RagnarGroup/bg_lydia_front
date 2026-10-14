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

export interface LandingLead {
  id: string;
  leadNumber: string;
  contactName: string;
  phone: string | null;
  email: string | null;
  sede: string;
  ciudad: string;
  programa: string;
  tags: string[];
  visitAt: string;
  visitStatus: VisitStatus;
  stage: LeadStage;
  assignedAgent: LandingAgentRef | null;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
}

export type LandingActivityType =
  "creado" | "tomado" | "liberado" | "estado_visita" | "reprogramada" | "nota" | "etapa";

export interface LandingActivity {
  id: string;
  type: LandingActivityType;
  content: string | null;
  meta: { from?: string | null; to?: string | null; auto?: boolean } | null;
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
}

export interface LandingLeadFilters {
  sede?: string;
  visitStatus?: VisitStatus;
  from?: string;
  to?: string;
  unclaimed?: boolean;
  search?: string;
}

export interface LandingVisitInput {
  status: VisitStatus;
  visitAt?: string;
  note?: string;
}
