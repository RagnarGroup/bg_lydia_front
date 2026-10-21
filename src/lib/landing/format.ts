import type { ConsultaDetalle, LandingActivity, LandingSede, VisitStatus } from "./types";

// LYD-84: helpers de la seccion Landing. Todo lo de fecha/hora se calcula a
// mano sobre America/Lima (UTC-5 fijo, Peru no tiene horario de verano) en
// vez de Intl/toLocaleString: mismo criterio que lib/format.ts (el ICU de
// Node y el del navegador no coinciden y rompen la hidratacion), y asi la
// hora es la de Lima aunque la asesora tenga otra zona en su equipo.

const LIMA_OFFSET_MS = -5 * 60 * 60 * 1000;
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTHS_LONG = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const WEEKDAYS_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const WEEKDAYS_LONG = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const pad2 = (n: number) => n.toString().padStart(2, "0");

// "Reloj de pared" de Lima: un Date cuyos getUTC* devuelven la fecha/hora de Lima.
function limaWall(input: Date | string | number): Date {
  const ms = input instanceof Date ? input.getTime() : new Date(input).getTime();
  return new Date(ms + LIMA_OFFSET_MS);
}

export function limaDateKey(input: Date | string | number): string {
  const d = limaWall(input);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function formatLimaTime(iso: string): string {
  const d = limaWall(iso);
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

// "20/10 10:00"
export function formatLimaShort(iso: string): string {
  const d = limaWall(iso);
  return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)} ${formatLimaTime(iso)}`;
}

// "lun 20 oct, 10:00"
export function formatVisit(iso: string): string {
  const d = limaWall(iso);
  return `${WEEKDAYS_SHORT[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}, ${formatLimaTime(iso)}`;
}

// "lunes 20 de octubre de 2026, 10:00"
export function formatVisitLong(iso: string): string {
  const d = limaWall(iso);
  return `${WEEKDAYS_LONG[d.getUTCDay()]} ${d.getUTCDate()} de ${MONTHS_LONG[d.getUTCMonth()]} de ${d.getUTCFullYear()}, ${formatLimaTime(iso)}`;
}

// "lunes 20 de oct" (encabezado de dia, a partir de una clave YYYY-MM-DD)
export function formatDayHeading(dateKey: string): string {
  const [y, m, day] = dateKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, day));
  return `${WEEKDAYS_LONG[d.getUTCDay()]} ${day} de ${MONTHS_SHORT[m - 1]}`;
}

// ISO (UTC) -> valor para <input type="datetime-local"> en hora de Lima.
export function toLimaInputValue(iso: string): string {
  const d = limaWall(iso);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

// Valor de <input type="datetime-local"> (hora de Lima) -> ISO UTC.
export function fromLimaInputValue(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00-05:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Lunes 00:00 (hora de Lima) de la semana que contiene `input`, como instante UTC.
export function startOfLimaWeek(input: Date | string | number): Date {
  const d = limaWall(input);
  const dow = (d.getUTCDay() + 6) % 7; // lunes = 0
  const mondayWall = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow);
  return new Date(mondayWall - LIMA_OFFSET_MS);
}

// Lima no tiene DST: sumar 24 h por dia es exacto.
export function addLimaDays(start: Date, days: number): Date {
  return new Date(start.getTime() + days * 86_400_000);
}

export function formatWeekRange(weekStart: Date): string {
  const a = limaWall(weekStart);
  const b = limaWall(addLimaDays(weekStart, 6));
  const left =
    a.getUTCMonth() === b.getUTCMonth() ? `${a.getUTCDate()}` : `${a.getUTCDate()} ${MONTHS_SHORT[a.getUTCMonth()]}`;
  return `${left} – ${b.getUTCDate()} ${MONTHS_SHORT[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
}

export function dayLabelShort(date: Date): { weekday: string; day: number } {
  const d = limaWall(date);
  return { weekday: WEEKDAYS_SHORT[d.getUTCDay()], day: d.getUTCDate() };
}

// Solo digitos; 9 digitos que empiezan con 9 = celular peruano sin codigo de pais.
export function whatsappUrl(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 9 && digits.startsWith("9")) digits = `51${digits}`;
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}`;
}

// Un color por sede, el mismo en toda la seccion (chip, filtros, calendario).
type SedeStyle = { chip: string; dot: string; solid: string };

export const SEDE_STYLES: Record<LandingSede, SedeStyle> = {
  Bustamante: { chip: "bg-sky-100 text-sky-800 border-sky-300", dot: "bg-sky-500", solid: "bg-sky-600 text-white" },
  Centro: {
    chip: "bg-violet-100 text-violet-800 border-violet-300",
    dot: "bg-violet-500",
    solid: "bg-violet-600 text-white",
  },
  Cayma: {
    chip: "bg-emerald-100 text-emerald-800 border-emerald-300",
    dot: "bg-emerald-500",
    solid: "bg-emerald-600 text-white",
  },
  Lince: { chip: "bg-rose-100 text-rose-800 border-rose-300", dot: "bg-rose-500", solid: "bg-rose-600 text-white" },
  Miraflores: {
    chip: "bg-amber-100 text-amber-900 border-amber-300",
    dot: "bg-amber-500",
    solid: "bg-amber-600 text-white",
  },
};

const FALLBACK_SEDE_STYLE: SedeStyle = {
  chip: "bg-slate-100 text-slate-700 border-slate-300",
  dot: "bg-slate-400",
  solid: "bg-slate-600 text-white",
};

export function sedeStyle(sede: string): SedeStyle {
  return SEDE_STYLES[sede as LandingSede] ?? FALLBACK_SEDE_STYLE;
}

export const VISIT_STATUS_META: Record<VisitStatus, { label: string; badge: string; block: string }> = {
  solicitada: {
    label: "Solicitada",
    badge: "bg-accent/15 text-accent-dark",
    block: "border-accent bg-accent/10 text-accent-dark",
  },
  confirmada: {
    label: "Confirmada",
    badge: "bg-brand/10 text-brand",
    block: "border-brand bg-brand/10 text-brand-dark",
  },
  reprogramada: {
    label: "Reprogramada",
    badge: "bg-violet-100 text-violet-700",
    block: "border-violet-400 bg-violet-50 text-violet-800",
  },
  asistio: {
    label: "Asistió",
    badge: "bg-success/10 text-success",
    block: "border-success bg-success/10 text-success",
  },
  no_asistio: {
    label: "No asistió",
    badge: "bg-danger/10 text-danger",
    block: "border-danger bg-danger/10 text-danger",
  },
  cancelada: {
    label: "Cancelada",
    badge: "bg-slate-200 text-slate-600",
    block: "border-slate-300 bg-slate-100 text-slate-500",
  },
};

export function visitStatusLabel(status: string | null | undefined): string {
  if (!status) return "";
  return VISIT_STATUS_META[status as VisitStatus]?.label ?? status;
}

const STAGE_LABELS: Record<string, string> = {
  contacto_inicial: "Contacto Inicial",
  negociacion: "Negociación",
  promesa_pago: "Promesa de pago",
  discusion_contrato: "Discusión de contrato",
  matriculado: "Matriculado",
  venta_perdida: "Venta Perdida",
};

export function stageLabel(stage: string | null | undefined): string {
  if (!stage) return "";
  return STAGE_LABELS[stage] ?? stage;
}

// Los from/to de reprogramada son fechas ISO, los de estado_visita y etapa son slugs.
function metaValue(type: LandingActivity["type"], value: string | null | undefined): string {
  if (!value) return "—";
  if (type === "reprogramada") return formatLimaShort(value);
  if (type === "etapa") return stageLabel(value);
  if (type === "estado_visita") return visitStatusLabel(value);
  return value;
}

// LYD-100: "Lima · 4 weeks · May 2027" a partir del detalle de una consulta.
export function consultaResumen(detalle: ConsultaDetalle | undefined): string {
  if (!detalle) return "";
  return [detalle.opcion, detalle.mesInicio].filter(Boolean).join(" · ");
}

export function describeActivity(activity: LandingActivity): string {
  const who = activity.agent?.name ?? "Alguien";
  const { from, to } = activity.meta ?? {};
  switch (activity.type) {
    case "creado":
      return activity.meta?.tipo === "consulta"
        ? `Consulta recibida desde la landing${consultaResumen(activity.meta.detalle) ? `: ${consultaResumen(activity.meta.detalle)}` : ""}`
        : "Lead recibido desde el formulario web";
    case "consulta": {
      const resumen = consultaResumen(activity.meta?.detalle);
      return `Nueva consulta del mismo correo${resumen ? `: ${resumen}` : ""}`;
    }
    case "tomado":
      return activity.meta?.auto ? `${who} tomó el lead (asignado al cambiar la visita)` : `${who} tomó el lead`;
    case "liberado":
      return `${who} liberó el lead`;
    case "estado_visita":
      return `${who} cambió la visita de ${metaValue("estado_visita", from)} a ${metaValue("estado_visita", to)}`;
    case "reprogramada":
      return `Visita reprogramada del ${metaValue("reprogramada", from)} al ${metaValue("reprogramada", to)}`;
    case "etapa":
      return `${who} movió la etapa de ${metaValue("etapa", from)} a ${metaValue("etapa", to)}`;
    case "nota":
      return `${who} agregó una nota`;
    default:
      return activity.content ?? "Actividad";
  }
}

export const LANDING_SEDE_STORAGE_KEY = "lydia:landing:sede";
