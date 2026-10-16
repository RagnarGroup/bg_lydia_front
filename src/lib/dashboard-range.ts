// LYD-93: rango de fechas del Panel de control personal (Hoy/Ayer/Semana/Mes/
// Fechas), en hora de Lima. Mismo criterio que campaign-period.ts: UTC-5 fijo
// (Peru no tiene horario de verano), sin Intl ni alias "@/" para que
// tests/*.test.mjs lo pueda importar.

const LIMA_OFFSET_MS = -5 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

export type DashboardRange = "Hoy" | "Ayer" | "Semana" | "Mes";

export interface DateBounds {
  from: string; // ISO, inclusivo
  to?: string; // ISO, inclusivo; sin `to` = hasta ahora
}

// 00:00 de Lima del dia (anio, mes 0-based, dia) como instante UTC.
function limaMidnight(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day) - LIMA_OFFSET_MS);
}

// Semana = desde el lunes; Mes = desde el dia 1 (calendario, no el periodo de
// campana 20-19 del embudo). Hoy/Semana/Mes quedan abiertos hacia adelante
// para que la clave de la consulta no cambie con cada render.
export function boundsForRange(range: DashboardRange, now: Date = new Date()): DateBounds {
  const wall = new Date(now.getTime() + LIMA_OFFSET_MS);
  const y = wall.getUTCFullYear();
  const m = wall.getUTCMonth();
  const d = wall.getUTCDate();
  const today = limaMidnight(y, m, d);

  switch (range) {
    case "Hoy":
      return { from: today.toISOString() };
    case "Ayer":
      return {
        from: new Date(today.getTime() - DAY_MS).toISOString(),
        to: new Date(today.getTime() - 1).toISOString(),
      };
    case "Semana": {
      const daysSinceMonday = (wall.getUTCDay() + 6) % 7;
      return { from: limaMidnight(y, m, d - daysSinceMonday).toISOString() };
    }
    case "Mes":
      return { from: limaMidnight(y, m, 1).toISOString() };
  }
}

// Rango manual desde dos <input type="date"> ("2026-10-01"), ambos dias
// completos e inclusivos. Devuelve null si falta alguno o estan invertidos.
export function boundsForDates(fromDay: string, toDay: string): DateBounds | null {
  const parse = (day: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
    return match ? limaMidnight(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
  };
  const start = parse(fromDay);
  const end = parse(toDay);
  if (!start || !end || end < start) return null;
  return { from: start.toISOString(), to: new Date(end.getTime() + DAY_MS - 1).toISOString() };
}
