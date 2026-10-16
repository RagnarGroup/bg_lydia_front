// LYD-91: periodos de campana del embudo. Las campanas se manejan del 20 de
// un mes al 19 del siguiente (ambos inclusive), en hora de Lima. Mismo
// criterio que lib/landing/format.ts: calculo manual sobre UTC-5 fijo (Peru
// no tiene horario de verano), sin Intl, para que SSR y navegador coincidan.
// Sin imports con alias "@/" para que tests/*.test.mjs lo pueda importar.

const LIMA_OFFSET_MS = -5 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;
const PERIOD_START_DAY = 20;
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const WEEKDAYS_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

const pad2 = (n: number) => n.toString().padStart(2, "0");

export interface CampaignPeriod {
  key: string; // "2026-09-20": dia de inicio, sirve de id del <select>
  start: Date; // instante del 20 a las 00:00 de Lima
  end: Date; // exclusivo: el 20 del mes siguiente a las 00:00 de Lima
  label: string; // "20 sep – 19 oct 2026"
}

function limaWall(input: Date | string | number): Date {
  const ms = input instanceof Date ? input.getTime() : new Date(input).getTime();
  return new Date(ms + LIMA_OFFSET_MS);
}

// 00:00 de Lima del dia (anio, mes 0-based, dia) como instante UTC. Date.UTC
// normaliza desbordes (mes 12 -> enero del anio siguiente).
function limaMidnight(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day) - LIMA_OFFSET_MS);
}

export function limaDayKey(input: Date | string | number): string {
  const d = limaWall(input);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function buildPeriod(year: number, month: number): CampaignPeriod {
  const start = limaMidnight(year, month, PERIOD_START_DAY);
  const end = limaMidnight(year, month + 1, PERIOD_START_DAY);
  const a = limaWall(start);
  const b = limaWall(end.getTime() - DAY_MS);
  const left =
    a.getUTCFullYear() === b.getUTCFullYear()
      ? `${a.getUTCDate()} ${MONTHS_SHORT[a.getUTCMonth()]}`
      : `${a.getUTCDate()} ${MONTHS_SHORT[a.getUTCMonth()]} ${a.getUTCFullYear()}`;
  return {
    key: limaDayKey(start),
    start,
    end,
    label: `${left} – ${b.getUTCDate()} ${MONTHS_SHORT[b.getUTCMonth()]} ${b.getUTCFullYear()}`,
  };
}

// Periodo que contiene el instante dado: del 20 en adelante es el periodo que
// arranca ese mes; del 1 al 19, el que arranco el mes anterior.
export function campaignPeriodFor(input: Date | string | number): CampaignPeriod {
  const d = limaWall(input);
  const month = d.getUTCDate() >= PERIOD_START_DAY ? d.getUTCMonth() : d.getUTCMonth() - 1;
  return buildPeriod(d.getUTCFullYear(), month);
}

// Periodos del mas reciente (el que contiene `now`) hacia atras, hasta cubrir
// `oldest` (el lead mas viejo) y como minimo `minCount`.
export function listCampaignPeriods(now: Date, oldest?: Date | string | null, minCount = 6): CampaignPeriod[] {
  const current = campaignPeriodFor(now);
  const oldestMs = oldest ? new Date(oldest).getTime() : Number.NaN;
  const periods: CampaignPeriod[] = [];
  const wall = limaWall(current.start);
  for (let i = 0; i < 120; i++) {
    const period = buildPeriod(wall.getUTCFullYear(), wall.getUTCMonth() - i);
    periods.push(period);
    const coversOldest = Number.isNaN(oldestMs) || period.start.getTime() <= oldestMs;
    if (periods.length >= minCount && coversOldest) break;
  }
  return periods;
}

export function isInPeriod(iso: string, period: CampaignPeriod): boolean {
  const ms = new Date(iso).getTime();
  return ms >= period.start.getTime() && ms < period.end.getTime();
}

export interface PeriodDay {
  key: string; // "2026-09-20"
  day: number;
  weekday: string;
  monthShort: string;
}

// Dias de calendario (Lima) del periodo, del 20 al 19.
export function periodDays(period: CampaignPeriod): PeriodDay[] {
  const days: PeriodDay[] = [];
  for (let ms = period.start.getTime(); ms < period.end.getTime(); ms += DAY_MS) {
    const d = limaWall(ms);
    days.push({
      key: limaDayKey(ms),
      day: d.getUTCDate(),
      weekday: WEEKDAYS_SHORT[d.getUTCDay()],
      monthShort: MONTHS_SHORT[d.getUTCMonth()],
    });
  }
  return days;
}
