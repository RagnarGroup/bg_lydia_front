"use client";

import { useMemo, useState } from "react";
import { getLeadsByStage, incomingRequests, leads as mockLeads, pipelineStages, sumBudget } from "@/lib/mock-data";
import type { Lead, PipelineStageId } from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/format";
import { LYDIA_API_ENABLED } from "@/lib/lydia-api/config";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { useCreateLead, useLeads } from "@/lib/queries/leads";
import { useAuth } from "@/components/providers/AuthProvider";
import { PipelineColumn } from "./PipelineColumn";
import { LeadCard } from "./LeadCard";
import { IncomingRequestCard } from "./IncomingRequestCard";
import { NewLeadModal } from "./NewLeadModal";

const MOCK_AGENT_ID = "mafer";

export function PipelineBoard() {
  const { data: realLeads = [], error: leadsError } = useLeads();
  const isMockMode = !LYDIA_API_ENABLED || leadsError !== null;
  const createLead = useCreateLead();
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

  const filteredLeads = useMemo(() => {
    return leadList.filter((lead) => {
      if (onlyMine && lead.assignedAgentId !== CURRENT_AGENT_ID) return false;
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        return lead.contactName.toLowerCase().includes(query) || lead.leadNumber.toLowerCase().includes(query);
      }
      return true;
    });
  }, [leadList, onlyMine, search]);

  const filteredIncoming = useMemo(() => {
    if (!search.trim()) return incomingRequests;
    const query = search.trim().toLowerCase();
    return incomingRequests.filter((r) => r.contactName.toLowerCase().includes(query));
  }, [search]);

  const handleCreateLead = (data: {
    contactName: string;
    phone: string;
    source: string;
    budgetAmount: number;
    stage: PipelineStageId;
  }) => {
    if (!isMockMode) {
      createLead.mutate({
        contactName: data.contactName,
        phone: data.phone,
        source: data.source,
        budgetAmount: data.budgetAmount,
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
      contactName: data.contactName,
      phone: data.phone,
      source: data.source,
      budgetAmount: data.budgetAmount,
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
            {formatNumber(leadList.length)} leads: {formatCurrency(sumBudget(leadList))}
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
                  onClick={() => setMenuOpen(false)}
                  className="block w-full px-3 py-1.5 text-left text-ink-soft hover:bg-bg-subtle"
                >
                  Exportar leads
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
                subtitle={`${stageLeads.length} Clientes Potenciales: ${formatCurrency(sumBudget(stageLeads))}`}
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
              subtitle={`${perdidos.length} Clientes Potenciales: ${formatCurrency(sumBudget(perdidos))}`}
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
