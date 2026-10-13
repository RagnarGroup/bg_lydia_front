"use client";

import type { LandingLead, LandingSummary, VisitStatus } from "@/lib/landing/types";
import { LANDING_SEDES, VISIT_STATUSES } from "@/lib/landing/types";
import { formatVisit, sedeStyle, visitStatusLabel } from "@/lib/landing/format";
import { formatRelativeTime } from "@/lib/format";
import { Icon } from "@/components/icons";
import { AgentDot, NewBadge, SedeChip, VisitStatusBadge } from "./badges";

interface Props {
  leads: LandingLead[];
  isLoading: boolean;
  error: Error | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  sede: string;
  onSedeChange: (sede: string) => void;
  summary: LandingSummary | undefined;
  visitStatus: VisitStatus | "todos";
  onVisitStatusChange: (status: VisitStatus | "todos") => void;
  unclaimedOnly: boolean;
  onUnclaimedOnlyChange: (value: boolean) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

// Selector de sede compartido con la pestana Calendario (mismo estado en LandingView).
export function SedeFilter({
  sede,
  onSedeChange,
  summary,
}: {
  sede: string;
  onSedeChange: (sede: string) => void;
  summary?: LandingSummary;
}) {
  const options = ["todas", ...LANDING_SEDES];
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por sede">
      {options.map((option) => {
        const active = sede === option;
        const free = option === "todas" ? summary?.unclaimed : summary?.bySede[option]?.unclaimed;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onSedeChange(option)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
              active
                ? "border-brand bg-brand text-white"
                : "border-line bg-surface text-ink-soft hover:border-brand/40 hover:text-ink"
            }`}
          >
            {option !== "todas" && <span className={`h-2 w-2 rounded-full ${sedeStyle(option).dot}`} />}
            {option === "todas" ? "Todas" : option}
            {free ? (
              <span
                title="Sin tomar"
                className={`rounded-full px-1.5 text-[10px] font-bold ${
                  active ? "bg-white/25 text-white" : "bg-accent text-white"
                }`}
              >
                {free}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function LeadRow({ lead, active, onClick }: { lead: LandingLead; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full flex-col gap-1.5 border-b border-line-soft px-4 py-3 text-left transition-colors ${
        active ? "bg-brand/10" : "hover:bg-bg-subtle"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <SedeChip sede={lead.sede} />
        <div className="flex items-center gap-2">
          {lead.assignedAgent ? <AgentDot agent={lead.assignedAgent} size={22} /> : <NewBadge />}
          <span className="text-xs text-muted">{formatRelativeTime(lead.createdAt)}</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold text-ink">{lead.contactName}</span>
        <span className="shrink-0 text-xs text-muted">{lead.programa}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm text-ink-soft">
          <Icon name="calendario" size={13} className="mr-1 inline -translate-y-px text-muted" />
          {formatVisit(lead.visitAt)}
        </span>
        <VisitStatusBadge status={lead.visitStatus} />
      </div>
    </button>
  );
}

export function LandingLeadList({
  leads,
  isLoading,
  error,
  selectedId,
  onSelect,
  sede,
  onSedeChange,
  summary,
  visitStatus,
  onVisitStatusChange,
  unclaimedOnly,
  onUnclaimedOnlyChange,
  search,
  onSearchChange,
}: Props) {
  return (
    <section className="flex h-full w-full shrink-0 flex-col border-r border-line bg-surface md:w-[380px]">
      <div className="flex flex-col gap-2.5 border-b border-line-soft p-3">
        <SedeFilter sede={sede} onSedeChange={onSedeChange} summary={summary} />
        <div className="relative">
          <Icon name="buscar" size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre, teléfono o correo…"
            className="w-full rounded-lg border border-line bg-bg-subtle py-1.5 pl-8 pr-3 text-sm focus:border-brand focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={visitStatus}
            onChange={(e) => onVisitStatusChange(e.target.value as VisitStatus | "todos")}
            aria-label="Estado de la visita"
            className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2 py-1.5 text-xs text-ink-soft focus:border-brand focus:outline-none"
          >
            <option value="todos">Todos los estados</option>
            {VISIT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {visitStatusLabel(s)}
              </option>
            ))}
          </select>
          <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium text-ink-soft">
            <input
              type="checkbox"
              checked={unclaimedOnly}
              onChange={(e) => onUnclaimedOnlyChange(e.target.checked)}
              className="h-3.5 w-3.5 accent-brand"
            />
            Solo sin tomar
          </label>
        </div>
      </div>

      <div className="scroll-slim flex-1 overflow-y-auto">
        {error && <p className="px-4 py-3 text-sm text-danger">No se pudo cargar la lista: {error.message}</p>}
        {isLoading && <p className="px-4 py-3 text-sm text-muted">Cargando leads…</p>}
        {!isLoading && !error && leads.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted">No hay leads con estos filtros.</p>
        )}
        {leads.map((lead) => (
          <LeadRow key={lead.id} lead={lead} active={lead.id === selectedId} onClick={() => onSelect(lead.id)} />
        ))}
      </div>
    </section>
  );
}
