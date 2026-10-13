"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import {
  addLimaDays,
  dayLabelShort,
  formatDayHeading,
  formatLimaTime,
  formatWeekRange,
  limaDateKey,
  sedeStyle,
  startOfLimaWeek,
  VISIT_STATUS_META,
} from "@/lib/landing/format";
import type { LandingLead, LandingSummary } from "@/lib/landing/types";
import { useLandingLeads } from "@/lib/queries/landing-leads";
import { SedeFilter } from "./LandingLeadList";

interface Props {
  sede: string;
  onSedeChange: (sede: string) => void;
  summary: LandingSummary | undefined;
  onOpenLead: (id: string) => void;
}

function VisitCard({ lead, onOpen }: { lead: LandingLead; onOpen: () => void }) {
  const meta = VISIT_STATUS_META[lead.visitStatus];
  const cancelled = lead.visitStatus === "cancelada";
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`${lead.contactName} · ${lead.sede} · ${meta?.label ?? lead.visitStatus}`}
      className={`flex w-full flex-col gap-0.5 rounded-md border-l-4 px-2 py-1.5 text-left text-xs shadow-sm transition-opacity hover:opacity-80 ${
        meta?.block ?? ""
      }`}
    >
      <span className="flex items-center gap-1.5 font-bold">
        {formatLimaTime(lead.visitAt)}
        <span className={`h-2 w-2 rounded-full ${sedeStyle(lead.sede).dot}`} />
        <span className="truncate text-[10px] font-semibold uppercase">{lead.sede}</span>
      </span>
      <span className={`truncate font-semibold ${cancelled ? "line-through" : ""}`}>{lead.contactName}</span>
      <span className="truncate text-[11px] opacity-80">
        {lead.programa} · {meta?.label}
      </span>
    </button>
  );
}

export function LandingCalendar({ sede, onSedeChange, summary, onOpenLead }: Props) {
  // useState con inicializador: "hoy" se fija al montar, no cambia en cada render.
  const [today] = useState(() => new Date());
  const [weekStart, setWeekStart] = useState(() => startOfLimaWeek(new Date()));

  const from = weekStart.toISOString();
  const to = new Date(addLimaDays(weekStart, 7).getTime() - 1000).toISOString();
  const {
    data: leads = [],
    isLoading,
    error,
  } = useLandingLeads({ sede: sede === "todas" ? undefined : sede, from, to });

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addLimaDays(weekStart, i)), [weekStart]);
  const byDay = useMemo(() => {
    const map = new Map<string, LandingLead[]>();
    for (const lead of [...leads].sort((a, b) => a.visitAt.localeCompare(b.visitAt))) {
      const key = limaDateKey(lead.visitAt);
      map.set(key, [...(map.get(key) ?? []), lead]);
    }
    return map;
  }, [leads]);

  const todayKey = limaDateKey(today);
  const dayKeys = days.map((d) => limaDateKey(d));
  const daysWithVisits = dayKeys.filter((k) => byDay.has(k));
  const shift = (weeks: number) => setWeekStart((w) => addLimaDays(w, weeks * 7));

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-bg">
      <div className="flex flex-col gap-3 border-b border-line bg-surface px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Semana anterior"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-ink-soft hover:bg-bg-subtle"
          >
            <Icon name="chevronDown" size={16} className="rotate-90" />
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Semana siguiente"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-ink-soft hover:bg-bg-subtle"
          >
            <Icon name="chevronDown" size={16} className="-rotate-90" />
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(startOfLimaWeek(new Date()))}
            className="rounded-md border border-line px-3 py-1.5 text-sm font-semibold text-ink-soft hover:bg-bg-subtle"
          >
            Hoy
          </button>
          <p className="ml-1 text-sm font-semibold text-ink">{formatWeekRange(weekStart)}</p>
          <span className="ml-auto text-xs text-muted">
            {isLoading ? "Cargando…" : `${leads.length} ${leads.length === 1 ? "visita" : "visitas"}`}
          </span>
        </div>
        <SedeFilter sede={sede} onSedeChange={onSedeChange} summary={summary} />
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {Object.entries(VISIT_STATUS_META).map(([key, m]) => (
            <span key={key} className="flex items-center gap-1 text-[11px] text-ink-soft">
              <span className={`h-2.5 w-2.5 rounded-sm border-l-4 ${m.block}`} />
              {m.label}
            </span>
          ))}
        </div>
      </div>

      {error && <p className="px-4 py-3 text-sm text-danger">No se pudo cargar el calendario: {error.message}</p>}

      {/* Escritorio: lunes a domingo, una columna por dia */}
      <div className="scroll-slim hidden flex-1 grid-cols-7 overflow-y-auto md:grid">
        {days.map((day, i) => {
          const key = dayKeys[i];
          const { weekday, day: dayNumber } = dayLabelShort(day);
          const isToday = key === todayKey;
          return (
            <div key={key} className="flex min-h-full flex-col border-r border-line last:border-r-0">
              <div
                className={`sticky top-0 z-10 border-b border-line px-2 py-2 text-center ${
                  isToday ? "bg-brand text-white" : "bg-surface text-ink-soft"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase">{weekday}</p>
                <p className="text-lg font-bold leading-tight">{dayNumber}</p>
              </div>
              <div className={`flex flex-1 flex-col gap-1.5 p-1.5 ${isToday ? "bg-brand/5" : ""}`}>
                {(byDay.get(key) ?? []).map((lead) => (
                  <VisitCard key={lead.id} lead={lead} onOpen={() => onOpenLead(lead.id)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Movil: lista agrupada por dia */}
      <div className="scroll-slim flex-1 overflow-y-auto p-3 md:hidden">
        {!isLoading && daysWithVisits.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">No hay visitas esta semana.</p>
        )}
        {daysWithVisits.map((key) => (
          <div key={key} className="mb-4">
            <p
              className={`mb-1.5 text-xs font-bold uppercase tracking-wide ${
                key === todayKey ? "text-brand" : "text-muted"
              }`}
            >
              {key === todayKey ? "Hoy · " : ""}
              {formatDayHeading(key)}
            </p>
            <div className="flex flex-col gap-1.5">
              {(byDay.get(key) ?? []).map((lead) => (
                <VisitCard key={lead.id} lead={lead} onOpen={() => onOpenLead(lead.id)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
