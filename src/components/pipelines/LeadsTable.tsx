"use client";

import { useMemo, useState } from "react";
import { getAgentById, leads as mockLeads, pipelineStages } from "@/lib/mock-data";
import type { PipelineStageId } from "@/lib/types";
import { formatCurrency, formatLeadCardDate } from "@/lib/format";
import { LYDIA_API_ENABLED } from "@/lib/lydia-api/config";
import { useAgents } from "@/lib/queries/conversations";
import { useLeads } from "@/lib/queries/leads";

export function LeadsTable() {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<PipelineStageId | "todas">("todas");
  const { data: realLeads = [], error: leadsError } = useLeads();
  const { data: realAgents = [] } = useAgents();
  const isMockMode = !LYDIA_API_ENABLED || leadsError !== null;
  const leads = isMockMode ? mockLeads : realLeads;

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      if (stageFilter !== "todas" && lead.stage !== stageFilter) return false;
      if (!search.trim()) return true;
      const query = search.trim().toLowerCase();
      return lead.contactName.toLowerCase().includes(query) || lead.leadNumber.toLowerCase().includes(query);
    });
  }, [leads, search, stageFilter]);

  return (
    <section className="flex h-full flex-1 flex-col overflow-hidden bg-bg-subtle">
      <header className="flex flex-wrap items-center gap-3 border-b border-line-soft bg-surface px-5 py-3">
        <h1 className="text-lg font-semibold tracking-wide text-ink">TODOS LOS LEADS</h1>

        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as PipelineStageId | "todas")}
          className="rounded-md border border-line px-2.5 py-1.5 text-sm text-ink-soft focus:border-brand focus:outline-none"
        >
          <option value="todas">Todas las etapas</option>
          {pipelineStages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>

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

        <p className="ml-auto text-sm text-ink-soft">{filtered.length} leads</p>
      </header>

      <div className="flex-1 overflow-auto px-5 py-4">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="border-b border-line pb-2">Lead</th>
              <th className="border-b border-line pb-2">Etapa</th>
              <th className="border-b border-line pb-2">Responsable</th>
              <th className="border-b border-line pb-2">Presupuesto</th>
              <th className="border-b border-line pb-2">Origen</th>
              <th className="border-b border-line pb-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => {
              const stage = pipelineStages.find((s) => s.id === lead.stage);
              const agentName = isMockMode
                ? getAgentById(lead.assignedAgentId)?.name
                : realAgents.find((a) => a.id === lead.assignedAgentId)?.name;
              return (
                <tr key={lead.id} className="hover:bg-surface">
                  <td className="border-b border-line-soft py-2.5 pr-4">
                    <p className="font-medium text-ink">{lead.contactName}</p>
                    <p className="text-xs text-brand">Lead {lead.leadNumber}</p>
                  </td>
                  <td className="border-b border-line-soft py-2.5 pr-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-white ${stage?.color ?? "bg-muted"}`}
                    >
                      {stage?.label}
                    </span>
                  </td>
                  <td className="border-b border-line-soft py-2.5 pr-4 text-ink-soft">
                    {agentName ? (
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-muted-2" />
                        {agentName}
                      </span>
                    ) : (
                      <span className="text-muted">Sin asignar</span>
                    )}
                  </td>
                  <td className="border-b border-line-soft py-2.5 pr-4 text-ink-soft">
                    {formatCurrency(lead.budgetAmount)}
                  </td>
                  <td className="border-b border-line-soft py-2.5 pr-4 text-ink-soft">{lead.source}</td>
                  <td className="border-b border-line-soft py-2.5 pr-4 text-muted">
                    {formatLeadCardDate(lead.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && <p className="mt-8 text-center text-sm text-muted">Sin leads para este filtro.</p>}
      </div>
    </section>
  );
}
