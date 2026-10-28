import type { Lead, LeadType } from "@/lib/types";

// LYD-115: tipos de lead. Solo "matricula" cuenta como oportunidad de venta;
// el resto se guarda para no perderlo, pero sale del pipeline y de las
// metricas comerciales.
export const LEAD_TYPES: { id: LeadType; label: string }[] = [
  { id: "matricula", label: "Matrícula" },
  { id: "empleo", label: "Postulante laboral" },
  { id: "alumno_actual", label: "Alumno actual" },
  { id: "otro", label: "Otro (no comercial)" },
];

// Valor del filtro que muestra todos los tipos (no es un tipo real).
export const ALL_LEAD_TYPES = "todos";
export type LeadTypeFilter = LeadType | typeof ALL_LEAD_TYPES;

export function leadTypeLabel(type: LeadType): string {
  return LEAD_TYPES.find((t) => t.id === type)?.label ?? type;
}

export function matchesLeadType(lead: Lead, filter: LeadTypeFilter): boolean {
  return filter === ALL_LEAD_TYPES || lead.leadType === filter;
}
