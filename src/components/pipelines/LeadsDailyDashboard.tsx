"use client";

import { useMemo, useState } from "react";
import type { Lead } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import {
  campaignPeriodFor,
  limaDayKey,
  listCampaignPeriods,
  periodDays,
  type CampaignPeriod,
} from "@/lib/campaign-period";

interface Props {
  leads: Lead[]; // ya filtrados por periodo, responsable y busqueda
  period: CampaignPeriod | null; // null = "Todas las fechas"
}

interface Bucket {
  key: string;
  top: string; // etiqueta principal bajo la barra
  bottom: string; // etiqueta secundaria
  title: string; // texto del tooltip
}

const CHART_HEIGHT = 220;
// Espacio sobre la barra mas alta para su etiqueta de valor.
const LABEL_SPACE = 18;
const BAR_AREA = CHART_HEIGHT - LABEL_SPACE;

// LYD-91: dashboard de leads ingresados (fecha de creacion del lead, hora de
// Lima). Con un periodo elegido: una barra por dia, del 20 al 19. Con "Todas
// las fechas": una barra por periodo de campana (por dia serian cientos).
export function LeadsDailyDashboard({ leads, period }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const byDay = period !== null;

  const { buckets, counts, bySource, todayKey, todayCount, elapsedDays } = useMemo(() => {
    const now = new Date();
    const todayKey = limaDayKey(now);
    const bucketKey = (iso: string) => (period ? limaDayKey(iso) : campaignPeriodFor(iso).key);

    const counts = new Map<string, number>();
    const sources = new Map<string, number>();
    let oldest: string | null = null;
    let todayCount = 0;
    for (const lead of leads) {
      if (limaDayKey(lead.createdAt) === todayKey) todayCount++;
      const key = bucketKey(lead.createdAt);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      const source = lead.source?.trim() || "Sin origen";
      sources.set(source, (sources.get(source) ?? 0) + 1);
      if (!oldest || lead.createdAt < oldest) oldest = lead.createdAt;
    }

    let buckets: Bucket[];
    let elapsedDays: number;
    if (period) {
      const days = periodDays(period);
      buckets = days.map((d) => ({
        key: d.key,
        top: String(d.day),
        bottom: d.weekday,
        title: `${d.weekday} ${d.day} ${d.monthShort}`,
      }));
      // Promedio sobre los dias ya transcurridos del periodo, no los futuros.
      elapsedDays = days.filter((d) => d.key <= todayKey).length || days.length;
    } else {
      // Del periodo del lead mas viejo al actual, en orden cronologico.
      const periods = oldest ? listCampaignPeriods(now, oldest, 1).reverse() : [];
      const first = periods[0];
      buckets = periods.map((p) => {
        const [startDay, startMonth] = p.label.split(" ");
        return { key: p.key, top: `${startDay} ${startMonth}`, bottom: p.key.slice(0, 4), title: p.label };
      });
      elapsedDays = first ? Math.max(1, Math.ceil((now.getTime() - first.start.getTime()) / 86_400_000)) : 1;
    }

    return {
      buckets,
      counts,
      bySource: [...sources.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
      todayKey,
      todayCount,
      elapsedDays,
    };
  }, [leads, period]);

  const total = leads.length;
  const max = Math.max(1, ...buckets.map((b) => counts.get(b.key) ?? 0));
  const best = buckets.reduce<{ bucket: Bucket; count: number } | null>((acc, b) => {
    const count = counts.get(b.key) ?? 0;
    return count > 0 && (!acc || count > acc.count) ? { bucket: b, count } : acc;
  }, null);
  const todayInRange = byDay && buckets.some((b) => b.key === todayKey);
  const hoveredBucket = hovered ? buckets.find((b) => b.key === hovered) : null;
  const sourceMax = Math.max(1, ...bySource.map((s) => s.count));
  const unit = byDay ? "día" : "periodo";

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={byDay ? "Leads en el periodo" : "Leads en total"} value={formatNumber(total)} />
        <Kpi
          label="Promedio diario"
          value={(total / elapsedDays).toFixed(1).replace(".", ",")}
          hint={`${formatNumber(elapsedDays)} días`}
        />
        <Kpi
          label={`Mejor ${unit}`}
          value={best ? formatNumber(best.count) : "—"}
          hint={best ? best.bucket.title : undefined}
        />
        <Kpi
          label="Hoy"
          value={todayInRange || !byDay ? formatNumber(todayCount) : "—"}
          hint={todayInRange || !byDay ? undefined : "Fuera del periodo"}
        />
      </div>

      <div className="mt-4 rounded-lg border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">
            {byDay ? "Leads ingresados por día" : "Leads ingresados por periodo de campaña (20 al 19)"}
          </h2>
          <p className="text-xs text-muted">
            {hoveredBucket
              ? `${hoveredBucket.title}: ${formatNumber(counts.get(hoveredBucket.key) ?? 0)} leads`
              : "Pasá el mouse por una barra para ver el detalle"}
          </p>
        </div>

        {buckets.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">Sin leads para este filtro.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <div className="relative" style={{ minWidth: buckets.length * (byDay ? 22 : 56) }}>
              {/* Lineas guia recesivas (maximo y mitad, en enteros), por detras de las barras */}
              <div className="pointer-events-none absolute inset-x-0 top-0" style={{ height: CHART_HEIGHT }}>
                {[...new Set([max, Math.round(max / 2)])]
                  .filter((v) => v > 0)
                  .map((v) => (
                    <div
                      key={v}
                      className="absolute inset-x-0 border-t border-dashed border-line-soft"
                      style={{ top: LABEL_SPACE + BAR_AREA * (1 - v / max) }}
                    >
                      <span className="absolute -top-2 left-0 bg-surface pr-1 text-[10px] text-muted">
                        {formatNumber(v)}
                      </span>
                    </div>
                  ))}
              </div>

              <div
                className="relative flex items-end gap-[2px] border-b border-line pl-6"
                style={{ height: CHART_HEIGHT }}
              >
                {buckets.map((b) => {
                  const count = counts.get(b.key) ?? 0;
                  const isToday = byDay && b.key === todayKey;
                  const isHovered = hovered === b.key;
                  return (
                    <div
                      key={b.key}
                      className="flex h-full min-w-[18px] flex-1 flex-col items-center justify-end"
                      onMouseEnter={() => setHovered(b.key)}
                      onMouseLeave={() => setHovered(null)}
                      title={`${b.title}: ${count} leads`}
                    >
                      {count > 0 && (
                        <span
                          className={`mb-0.5 text-[10px] ${isHovered ? "font-semibold text-ink" : "text-ink-soft"}`}
                        >
                          {formatNumber(count)}
                        </span>
                      )}
                      <div
                        className={`w-full max-w-[28px] rounded-t-[4px] ${
                          isHovered ? "bg-brand-dark" : isToday ? "bg-accent" : "bg-brand"
                        }`}
                        style={{ height: count > 0 ? Math.max(2, (count / max) * BAR_AREA) : 0 }}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-[2px] pl-6 pt-1">
                {buckets.map((b) => (
                  <div key={b.key} className="min-w-[18px] flex-1 text-center leading-tight">
                    <p
                      className={`text-[10px] ${byDay && b.key === todayKey ? "font-semibold text-accent-dark" : "text-ink-soft"}`}
                    >
                      {b.top}
                    </p>
                    <p className="text-[9px] text-muted">{b.bottom}</p>
                  </div>
                ))}
              </div>
            </div>
            {todayInRange && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
                <span className="h-2 w-2 rounded-sm bg-accent" /> Hoy
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Leads por origen</h2>
        {bySource.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Sin leads para este filtro.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2.5">
            {bySource.map((s) => (
              <div key={s.source} className="flex items-center gap-3" title={`${s.source}: ${s.count}`}>
                <span className="w-40 shrink-0 truncate text-xs text-ink-soft">{s.source}</span>
                <div className="h-2 flex-1 rounded-full bg-bg-subtle">
                  <div className="h-2 rounded-r-[4px] bg-brand" style={{ width: `${(s.count / sourceMax) * 100}%` }} />
                </div>
                <span className="w-20 shrink-0 text-right text-xs font-semibold text-ink">
                  {formatNumber(s.count)}{" "}
                  <span className="font-normal text-muted">({Math.round((s.count / total) * 100)}%)</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
      {hint && <p className="text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}
