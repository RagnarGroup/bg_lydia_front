"use client";

import { useMemo, useState } from "react";
import {
  agents,
  calendarEvents,
  getLeadSourceBreakdown,
  getLeadsByStage,
  insightsSnapshot,
  leads,
  conversations,
} from "@/lib/mock-data";
import { LYDIA_API_ENABLED } from "@/lib/lydia-api/config";
import { usePersonalInsights } from "@/lib/queries/insights";
import { boundsForDates, boundsForRange, type DashboardRange } from "@/lib/dashboard-range";
import { Icon } from "@/components/icons";
import { StatTile } from "./StatTile";
import { SourceBarList } from "./SourceBarList";

const rangeTabs: DashboardRange[] = ["Hoy", "Ayer", "Semana", "Mes"];

// Paleta generica para fuentes reales: a diferencia del mock, el back no
// conoce de antemano que valores tiene el campo Lead.source (texto libre) --
// no podemos mapear por nombre contra SOURCE_COLOR_ORDER (mock-data.ts) sin
// perder en silencio cualquier fuente que no este en esa lista fija de 6.
const REAL_SOURCE_COLORS = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#7c3aed", "#0891b2"];

function fuentesToEntries(fuentes: Record<string, number>) {
  return Object.entries(fuentes)
    .map(([source, count], i) => ({ source, count, hex: REAL_SOURCE_COLORS[i % REAL_SOURCE_COLORS.length] }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);
}

// mensajesEntrantes/lapsoMedioRespuesta/lapsoMayorRespuesta/deltasPorSemana
// todavia no los calcula el back (LYD-94): con la API activa se muestran sin
// datos en vez de los numeros de ejemplo de insightsSnapshot. El resto de los
// agregados viene del back cuando esta habilitado.
//
// LYD-93: el periodo (Hoy/Ayer/Semana/Mes o Fechas) filtra solo las metricas
// de flujo -- leads ganados/perdidos, fuentes y tareas. Las tarjetas de estado
// actual se marcan como tales porque no cambian con el periodo.
export function PersonalDashboard() {
  const [range, setRange] = useState<DashboardRange | "Fechas">("Semana");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [userFilter, setUserFilter] = useState("todo");

  // Se recalcula solo al cambiar de pestana o de fechas: Hoy/Semana/Mes quedan
  // abiertos hacia adelante, asi que no hace falta mover el limite con el reloj.
  const bounds = useMemo(
    () => (range === "Fechas" ? boundsForDates(customFrom, customTo) : boundsForRange(range)),
    [range, customFrom, customTo],
  );

  const { data: realInsights, error: insightsError } = usePersonalInsights({
    ...(userFilter !== "todo" ? { agentId: userFilter } : {}),
    ...(bounds ?? {}),
  });
  const isMockMode = !LYDIA_API_ENABLED || insightsError !== null || !realInsights;
  // Sin back real se muestran los deltas de ejemplo; con back, ninguno (LYD-94).
  const deltas = isMockMode ? insightsSnapshot.deltasPorSemana : undefined;

  const mockLeadsGanados = getLeadsByStage(leads, "matriculado");
  const mockLeadsActivos = leads.filter((l) => l.stage !== "matriculado" && l.stage !== "venta_perdida");
  const mockLeadsPerdidos = getLeadsByStage(leads, "venta_perdida");

  const dialogosVigentes = isMockMode
    ? conversations.filter((c) => c.status !== "cerrado").length
    : realInsights.dialogosVigentes;
  const dialogosSinReplica = isMockMode
    ? conversations.filter((c) => c.status === "sin_respuesta").length
    : realInsights.dialogosSinReplica;
  const leadsGanados = isMockMode
    ? { count: mockLeadsGanados.length }
    : realInsights.leadsGanados;
  const leadsActivos = isMockMode
    ? { count: mockLeadsActivos.length }
    : realInsights.leadsActivos;
  const leadsPerdidos = isMockMode ? mockLeadsPerdidos.length : realInsights.leadsPerdidos.count;
  const leadsSinTareas = isMockMode
    ? leads.filter((l) => !l.hasPendingTasks).length
    : realInsights.leadsSinTareas.count;
  const fuentes = isMockMode ? getLeadSourceBreakdown(leads) : fuentesToEntries(realInsights.fuentes);
  const tareas = isMockMode ? calendarEvents.length : realInsights.tareas.count;

  return (
    <section className="scroll-slim h-full flex-1 overflow-y-auto bg-gradient-to-br from-[#0b1a33] to-[#0f2447] px-8 py-6">
      <h1 className="text-2xl font-bold text-white">Brittany Group 2026</h1>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-md border border-white/15 bg-[#132845] p-1 text-sm font-semibold text-[#c3c2b7]">
          {rangeTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setRange(tab)}
              className={`rounded px-3 py-1 uppercase tracking-wide ${
                range === tab ? "bg-white/10 text-white" : "hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setRange("Fechas")}
            className={`flex items-center gap-1 rounded px-3 py-1 uppercase tracking-wide ${
              range === "Fechas" ? "bg-white/10 text-white" : "hover:text-white"
            }`}
          >
            <Icon name="calendario" size={14} />
            Fechas
          </button>
        </div>

        {range === "Fechas" && (
          <div className="flex items-center gap-2 text-sm text-[#c3c2b7]">
            <input
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => setCustomFrom(e.target.value)}
              aria-label="Desde"
              className="rounded-md border border-white/15 bg-[#132845] px-2 py-1.5 text-[#c3c2b7] [color-scheme:dark] focus:outline-none"
            />
            <span>a</span>
            <input
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => setCustomTo(e.target.value)}
              aria-label="Hasta"
              className="rounded-md border border-white/15 bg-[#132845] px-2 py-1.5 text-[#c3c2b7] [color-scheme:dark] focus:outline-none"
            />
          </div>
        )}

        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="rounded-md border border-white/15 bg-[#132845] px-3 py-2 text-sm font-medium text-[#c3c2b7] focus:outline-none"
        >
          <option value="todo">Todo</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="ml-auto flex items-center gap-1.5 rounded-md border border-white/15 bg-[#132845] px-3 py-2 text-sm font-semibold text-[#c3c2b7] hover:text-white"
        >
          <Icon name="ajustes" size={14} />
          Configurar
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="row-span-2 rounded-lg border border-white/10 bg-[#132845] p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#c3c2b7]">Mensajes entrantes</p>
            <Icon name="bandeja" size={16} className="text-[#c3c2b7]" />
          </div>
          {isMockMode ? (
            <>
              <p className="mt-2 text-3xl font-bold text-white">{insightsSnapshot.mensajesEntrantes.total}</p>
              <p className="flex items-center gap-1 text-xs font-semibold text-[#0ca30c]">
                <Icon name="flecha" size={12} strokeWidth={2.5} className="-rotate-90" />+
                {insightsSnapshot.deltasPorSemana.mensajesEntrantes} por semana
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {insightsSnapshot.mensajesEntrantes.canales.map((canal) => (
                  <div key={canal.label} className="flex items-center justify-between text-xs">
                    <span className="text-[#c3c2b7]">{canal.label}</span>
                    <span className="font-semibold text-white">{canal.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-3xl font-bold text-white">{NO_DATA}</p>
              <NoDataNote />
            </>
          )}
        </div>

        <StatTile
          label="Diálogos vigentes"
          value={String(dialogosVigentes)}
          delta={deltas?.dialogosVigentes}
          icon="chat"
        >
          {!isMockMode && <CurrentStateNote />}
        </StatTile>
        <StatTile
          label="Diálogos sin réplica"
          value={String(dialogosSinReplica)}
          delta={deltas?.dialogosSinReplica}
          invert
          icon="chat"
        >
          {!isMockMode && <CurrentStateNote />}
        </StatTile>

        <div className="row-span-2 rounded-lg border border-white/10 bg-[#132845] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#c3c2b7]">Fuentes de leads</p>
          <div className="mt-4">
            <SourceBarList entries={fuentes} />
          </div>
        </div>

        <StatTile
          label="Lapso medio de réplica"
          value={isMockMode ? insightsSnapshot.lapsoMedioRespuesta : NO_DATA}
          icon="rayo"
        >
          {!isMockMode && <NoDataNote />}
        </StatTile>
        <StatTile
          label="Lapso mayor de réplica"
          value={isMockMode ? insightsSnapshot.lapsoMayorRespuesta : NO_DATA}
          icon="rayo"
        >
          {!isMockMode && <NoDataNote />}
        </StatTile>

        <StatTile
          label="Leads ganados"
          value={String(leadsGanados.count)}
          delta={deltas?.leadsGanados}
          icon="embudo"
        />
        <StatTile
          label="Cantidad de leads activos"
          value={String(leadsActivos.count)}
          delta={deltas?.leadsActivos}
          icon="tabla"
        >
          {!isMockMode && <CurrentStateNote />}
        </StatTile>
        <StatTile label="Tareas" value={String(tareas)} delta={deltas?.tareas} icon="calendario" />

        <StatTile label="Cantidad de leads perdidos" value={String(leadsPerdidos)} icon="embudo" />
        <StatTile label="Leads sin tareas" value={String(leadsSinTareas)} icon="calendario">
          {!isMockMode && <CurrentStateNote />}
        </StatTile>
      </div>
    </section>
  );
}

const NO_DATA = "—";

function NoDataNote() {
  return <p className="mt-2 text-xs text-[#c3c2b7]/70">Sin datos todavía</p>;
}

function CurrentStateNote() {
  return <p className="mt-2 text-xs text-[#c3c2b7]/70">Estado actual, no depende del periodo</p>;
}
