"use client";

import { useMemo, useState } from "react";
import { getAgentById, getLeadsByStage, incomingRequests, leads as mockLeads, pipelineStages } from "@/lib/mock-data";
import type { Lead, PipelineStageId } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import { LYDIA_API_ENABLED } from "@/lib/lydia-api/config";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { useCreateLead, useLeads } from "@/lib/queries/leads";
import { useAgents } from "@/lib/queries/conversations";
import { campaignPeriodFor, isInPeriod, limaDayKey, listCampaignPeriods } from "@/lib/campaign-period";
import { buildXlsx, downloadXlsx } from "@/lib/leads-export";
import { ALL_LEAD_TYPES, LEAD_TYPES, leadTypeLabel, matchesLeadType, type LeadTypeFilter } from "@/lib/lead-types";
import { useAuth } from "@/components/providers/AuthProvider";
import { PipelineColumn } from "./PipelineColumn";
import { LeadCard } from "./LeadCard";
import { IncomingRequestCard } from "./IncomingRequestCard";
import { NewLeadModal } from "./NewLeadModal";
import { LeadsDailyDashboard } from "./LeadsDailyDashboard";

const MOCK_AGENT_ID = "mafer";
const ALL_PERIODS = "todas";

export function PipelineBoard() {
  const { data: realLeads = [], error: leadsError } = useLeads();
  const isMockMode = !LYDIA_API_ENABLED || leadsError !== null;
  const createLead = useCreateLead();
  const { data: realAgents = [] } = useAgents();
  const { agent } = useAuth();
  // LYD-2: en modo mock seguimos filtrando contra el agente de ejemplo
  // (los datos de mock-data.ts usan ids tipo "mafer"); en modo real es el
  // agente de la sesion (Agent.id real de lydia_bg_back).
  const CURRENT_AGENT_ID = isMockMode ? MOCK_AGENT_ID : (agent?.id ?? "");

  // Modo mock: estado local editable (como antes de LYD-8). Modo real: la
  // lista viene de React Query, editar es via mutacion, no via setState.
  const [mockLeadList, setMockLeadList] = useState<Lead[]>(mockLeads);
  const leadList = isMockMode ? mockLeadList : realLeads;
  const [search, setSearch] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEscapeKey(filterMenuOpen, () => setFilterMenuOpen(false));
  useEscapeKey(menuOpen, () => setMenuOpen(false));
  const [modalStage, setModalStage] = useState<PipelineStageId | null>(null);
  // LYD-91: periodo de campana (20 al 19, hora de Lima); por defecto el actual.
  const [periodKey, setPeriodKey] = useState<string>(() => campaignPeriodFor(new Date()).key);
  const [view, setView] = useState<"tablero" | "dashboard">("tablero");
  // LYD-115: por defecto solo oportunidades de matricula (ni postulantes
  // laborales ni alumnos actuales).
  const [typeFilter, setTypeFilter] = useState<LeadTypeFilter>("matricula");

  const periods = useMemo(() => {
    const oldest = leadList.reduce<string | null>(
      (min, lead) => (!min || lead.createdAt < min ? lead.createdAt : min),
      null,
    );
    return listCampaignPeriods(new Date(), oldest);
  }, [leadList]);
  const selectedPeriod = periods.find((p) => p.key === periodKey) ?? null;

  const filteredLeads = useMemo(() => {
    return leadList.filter((lead) => {
      if (selectedPeriod && !isInPeriod(lead.createdAt, selectedPeriod)) return false;
      if (!matchesLeadType(lead, typeFilter)) return false;
      if (onlyMine && lead.assignedAgentId !== CURRENT_AGENT_ID) return false;
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        return lead.contactName.toLowerCase().includes(query) || lead.leadNumber.toLowerCase().includes(query);
      }
      return true;
    });
  }, [leadList, onlyMine, search, selectedPeriod, typeFilter, CURRENT_AGENT_ID]);

  const filteredIncoming = useMemo(() => {
    if (!search.trim()) return incomingRequests;
    const query = search.trim().toLowerCase();
    return incomingRequests.filter((r) => r.contactName.toLowerCase().includes(query));
  }, [search]);

  // LYD-91: exporta lo que se ve (periodo + responsable + busqueda), no toda la base.
  const handleExport = () => {
    setMenuOpen(false);
    const columns = [
      { header: "Lead", width: 12 },
      { header: "Nombre", width: 28 },
      { header: "Teléfono", width: 18 },
      { header: "Email", width: 28 },
      { header: "Empresa", width: 20 },
      { header: "Origen", width: 22 },
      { header: "Tipo", width: 20 },
      { header: "Etapa", width: 20 },
      { header: "Responsable", width: 18 },
      { header: "Participación (%)", width: 30 },
      { header: "Fecha de ingreso", width: 18 },
    ];
    const rows = filteredLeads.map((lead) => [
      lead.leadNumber,
      lead.contactName,
      lead.phone,
      lead.email,
      lead.company,
      lead.source,
      leadTypeLabel(lead.leadType),
      pipelineStages.find((s) => s.id === lead.stage)?.label ?? lead.stage,
      (isMockMode
        ? getAgentById(lead.assignedAgentId)?.name
        : realAgents.find((a) => a.id === lead.assignedAgentId)?.name) ?? "Sin asignar",
      (lead.participants ?? []).map((p) => `${p.name} ${p.percent}%`).join(", "),
      new Date(lead.createdAt),
    ]);
    const suffix = selectedPeriod ? `${selectedPeriod.key}_al_${campaignPeriodEndKey(selectedPeriod.end)}` : "todas";
    downloadXlsx(`leads_${suffix}.xlsx`, buildXlsx("Leads", columns, rows));
  };

  const handleCreateLead = (data: {
    contactName: string;
    phone: string;
    source: string;
    stage: PipelineStageId;
  }) => {
    if (!isMockMode) {
      createLead.mutate({
        contactName: data.contactName,
        phone: data.phone,
        source: data.source,
        stage: data.stage,
        assignedAgentId: CURRENT_AGENT_ID,
      });
      setModalStage(null);
      return;
    }

    const newLead: Lead = {
      id: `lead-local-${Date.now()}`,
      code: `AS${Math.floor(100 + Math.random() * 900)}`,
      leadNumber: `#${Math.floor(10000000 + Math.random() * 89999999)}`,
      leadType: "matricula",
      contactName: data.contactName,
      phone: data.phone,
      source: data.source,
      budgetAmount: 0,
      stage: data.stage,
      assignedAgentId: CURRENT_AGENT_ID,
      createdAt: new Date().toISOString(),
      hasPendingTasks: false,
    };
    setMockLeadList((prev) => [newLead, ...prev]);
    setModalStage(null);
  };

  return (
    <section className="flex h-full flex-1 flex-col overflow-hidden bg-bg-subtle">
      <header className="flex flex-wrap items-center gap-3 border-b border-line-soft bg-surface px-5 py-3">
        <h1 className="text-lg font-semibold tracking-wide text-ink">LEADS</h1>

        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={filterMenuOpen}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium ${
              onlyMine ? "border-brand/30 bg-brand/10 text-brand-dark" : "border-line text-ink-soft hover:bg-bg-subtle"
            }`}
          >
            {onlyMine ? "Asignado a mí" : "Todos los leads"}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {filterMenuOpen && (
            <div
              role="menu"
              className="absolute left-0 z-10 mt-1 w-44 rounded-md border border-line bg-surface py-1 text-sm shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOnlyMine(false);
                  setFilterMenuOpen(false);
                }}
                className="block w-full px-3 py-1.5 text-left text-ink-soft hover:bg-bg-subtle"
              >
                Todos los leads
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOnlyMine(true);
                  setFilterMenuOpen(false);
                }}
                className="block w-full px-3 py-1.5 text-left text-ink-soft hover:bg-bg-subtle"
              >
                Asignado a mí
              </button>
            </div>
          )}
        </div>

        <select
          value={selectedPeriod ? periodKey : ALL_PERIODS}
          onChange={(e) => setPeriodKey(e.target.value)}
          aria-label="Periodo de campaña"
          className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink-soft focus:border-brand focus:outline-none"
        >
          {periods.map((p, i) => (
            <option key={p.key} value={p.key}>
              {p.label}
              {i === 0 ? " (actual)" : ""}
            </option>
          ))}
          <option value={ALL_PERIODS}>Todas las fechas</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as LeadTypeFilter)}
          aria-label="Tipo de lead"
          className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink-soft focus:border-brand focus:outline-none"
        >
          {LEAD_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
          <option value={ALL_LEAD_TYPES}>Todos los tipos</option>
        </select>

        <div className="flex rounded-md border border-line p-0.5 text-sm" role="tablist" aria-label="Vista">
          {(["tablero", "dashboard"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`rounded px-2.5 py-1 font-medium ${
                view === v ? "bg-brand text-white" : "text-ink-soft hover:bg-bg-subtle"
              }`}
            >
              {v === "tablero" ? "Tablero" : "Dashboard"}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px] flex-1">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="text"
            placeholder="Buscar"
            className="w-full rounded-lg border border-line bg-bg-subtle py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none"
          />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <p className="text-sm text-ink-soft">
            {formatNumber(filteredLeads.length)} leads
          </p>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Más opciones"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-bg-subtle hover:text-ink-soft"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="19" cy="12" r="1.5" />
              </svg>
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-10 mt-1 w-44 rounded-md border border-line bg-surface py-1 text-sm shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleExport}
                  disabled={filteredLeads.length === 0}
                  className="block w-full px-3 py-1.5 text-left text-ink-soft hover:bg-bg-subtle disabled:cursor-not-allowed disabled:text-muted-2"
                >
                  Exportar leads ({formatNumber(filteredLeads.length)})
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="block w-full px-3 py-1.5 text-left text-ink-soft hover:bg-bg-subtle"
                >
                  Configurar etapas
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setModalStage("contacto_inicial")}
            className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            + NUEVO LEAD
          </button>
        </div>
      </header>

      {view === "dashboard" ? (
        <LeadsDailyDashboard leads={filteredLeads} period={selectedPeriod} />
      ) : (
        <div className="flex flex-1 overflow-x-auto">
          <PipelineColumn
            title="LEADS ENTRANTES"
            subtitle={`Solicitudes: ${incomingRequests.length}`}
            isEmpty={filteredIncoming.length === 0}
          >
            {filteredIncoming.map((request) => (
              <IncomingRequestCard key={request.id} request={request} />
            ))}
          </PipelineColumn>

          {pipelineStages
            .filter((stage) => stage.id !== "venta_perdida")
            .map((stage) => {
              const stageLeads = getLeadsByStage(filteredLeads, stage.id);
              return (
                <PipelineColumn
                  key={stage.id}
                  title={stage.label.toUpperCase()}
                  subtitle={`${stageLeads.length} Clientes Potenciales`}
                  accentColor={stage.color}
                  quickActionLabel={stage.id === "contacto_inicial" ? "Lead rápido" : undefined}
                  onQuickAction={() => setModalStage(stage.id)}
                  isEmpty={stageLeads.length === 0}
                >
                  {stageLeads.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} />
                  ))}
                </PipelineColumn>
              );
            })}

          {(() => {
            const perdidos = getLeadsByStage(filteredLeads, "venta_perdida");
            return (
              <PipelineColumn
                title="VENTA PERDIDA"
                subtitle={`${perdidos.length} Clientes Potenciales`}
                accentColor="bg-danger"
                isEmpty={perdidos.length === 0}
              >
                {perdidos.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} />
                ))}
              </PipelineColumn>
            );
          })()}
        </div>
      )}

      {modalStage && (
        <NewLeadModal
          initialStage={modalStage}
          lockStage={false}
          onClose={() => setModalStage(null)}
          onCreate={handleCreateLead}
        />
      )}
    </section>
  );
}

// Ultimo dia (inclusive) del periodo, para el nombre del archivo: end es exclusivo.
function campaignPeriodEndKey(end: Date): string {
  return limaDayKey(end.getTime() - 86_400_000);
}
