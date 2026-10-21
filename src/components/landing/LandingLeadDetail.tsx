"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Icon } from "@/components/icons";
import { pipelineStages } from "@/lib/mock-data";
import type { LeadStage } from "@/lib/lydia-api/types";
import { formatVisitLong, whatsappUrl } from "@/lib/landing/format";
import type { VisitStatus } from "@/lib/landing/types";
import {
  useClaimLandingLead,
  useLandingLead,
  useReleaseLandingLead,
  useSetLandingStage,
  useSetLandingVisit,
} from "@/lib/queries/landing-leads";
import { ConsultaChip, NewBadge, SedeChip, TagChip, VisitStatusBadge } from "./badges";
import { ConfirmDialog, RescheduleDialog } from "./LandingDialogs";

// LYD-87: orden y etiqueta de los datos de campana que reenvia la landing.
const ATTRIBUTION_FIELDS: [string, string][] = [
  ["utm_source", "Fuente"],
  ["utm_medium", "Medio"],
  ["utm_campaign", "Campaña"],
  ["utm_content", "Contenido"],
  ["utm_term", "Término"],
  ["fbclid", "fbclid"],
  ["referrer", "Referrer"],
  ["landing_url", "Landing"],
];

// Estados finales: ya no admiten confirmar/reprogramar/asistencia.
const TERMINAL: VisitStatus[] = ["asistio", "no_asistio", "cancelada"];

function ContactRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="min-w-0 truncate text-right text-ink-soft">{children}</span>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "primary" | "default" | "danger";
}) {
  const tones = {
    primary: "bg-brand text-white hover:bg-brand-dark",
    default: "border border-line bg-surface text-ink-soft hover:bg-bg-subtle",
    danger: "border border-danger/40 bg-surface text-danger hover:bg-danger/10",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

interface Props {
  leadId: string;
  onBack: () => void;
  // Contenido extra al final (el panel de historial en pantallas chicas).
  footer?: React.ReactNode;
}

export function LandingLeadDetail({ leadId, onBack, footer }: Props) {
  const { agent } = useAuth();
  const { data: lead, isLoading, error } = useLandingLead(leadId);
  const claim = useClaimLandingLead();
  const release = useReleaseLandingLead();
  const setVisit = useSetLandingVisit();
  const setStage = useSetLandingStage();

  const [actionError, setActionError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"reprogramar" | "cancelar" | null>(null);

  const busy = claim.isPending || release.isPending || setVisit.isPending || setStage.isPending;

  const run = async (action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "No se pudo completar la acción");
    } finally {
      setDialog(null);
    }
  };

  const header = (
    <button
      type="button"
      onClick={onBack}
      className="mb-3 flex items-center gap-1 text-sm font-medium text-brand md:hidden"
    >
      <Icon name="flecha" size={14} className="rotate-180" />
      Volver a la lista
    </button>
  );

  if (isLoading) {
    return (
      <section className="flex-1 overflow-y-auto bg-bg p-5 text-sm text-muted">
        {header}
        Cargando lead…
      </section>
    );
  }
  if (error || !lead) {
    return (
      <section className="flex-1 overflow-y-auto bg-bg p-5 text-sm text-danger">
        {header}
        No se pudo cargar el lead{error ? `: ${error.message}` : "."}
      </section>
    );
  }

  const unclaimed = lead.assignedAgent === null;
  // LYD-100: consulta de una landing sin visita a sede (se atiende por correo).
  const esConsulta = lead.tipo === "consulta" || !lead.visitStatus || !lead.visitAt;
  const isTerminal = lead.visitStatus ? TERMINAL.includes(lead.visitStatus) : false;
  const isOwner = lead.assignedAgent?.id === agent?.id;
  const canRelease = !unclaimed && (isOwner || agent?.role === "administrador");
  const wa = whatsappUrl(lead.phone);
  const attributionRows = ATTRIBUTION_FIELDS.flatMap(([key, label]) => {
    const value = lead.attribution?.[key];
    return value ? [[label, value] as [string, string]] : [];
  });

  const changeVisit = (status: VisitStatus) => run(() => setVisit.mutateAsync({ id: lead.id, status }));

  return (
    <section className="scroll-slim flex-1 overflow-y-auto bg-bg p-5">
      {header}

      <div className="rounded-xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-center gap-2">
          {lead.sede ? <SedeChip sede={lead.sede} size="lg" /> : <ConsultaChip size="lg" />}
          {lead.ciudad && <span className="text-sm font-semibold text-ink-soft">{lead.ciudad}</span>}
          {unclaimed && <NewBadge />}
        </div>
        <h1 className="mt-3 text-xl font-bold text-ink">{lead.contactName}</h1>
        <p className="mt-0.5 text-sm text-muted">
          {lead.leadNumber} · Programa {lead.programa}
        </p>
        {lead.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {lead.tags.map((tag) => (
              <TagChip key={tag} tag={tag} />
            ))}
          </div>
        )}

        {esConsulta || !lead.visitAt || !lead.visitStatus ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-violet-50 px-3.5 py-3">
            <Icon name="correo" size={20} className="shrink-0 text-violet-600" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted">Consulta sin visita a sede · se responde por correo</p>
              {lead.email ? (
                <a href={`mailto:${lead.email}`} className="font-semibold text-ink">
                  {lead.email}
                </a>
              ) : (
                <p className="font-semibold text-ink">Sin correo</p>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-bg-subtle px-3.5 py-3">
            <Icon name="calendario" size={20} className="shrink-0 text-brand" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted">
                {lead.visitStatus === "confirmada" ? "Visita confirmada" : "Visita solicitada"}
              </p>
              <p className="font-semibold first-letter:uppercase text-ink">{formatVisitLong(lead.visitAt)}</p>
            </div>
            <VisitStatusBadge status={lead.visitStatus} />
          </div>
        )}

        {actionError && (
          <p
            role="alert"
            className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {actionError}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {unclaimed && (
            <ActionButton tone="primary" disabled={busy} onClick={() => run(() => claim.mutateAsync(lead.id))}>
              Tomar lead
            </ActionButton>
          )}
          {!esConsulta && !isTerminal && lead.visitStatus !== "confirmada" && (
            <ActionButton
              tone={unclaimed ? "default" : "primary"}
              disabled={busy}
              onClick={() => changeVisit("confirmada")}
            >
              Confirmar visita
            </ActionButton>
          )}
          {!esConsulta && !isTerminal && (
            <ActionButton disabled={busy} onClick={() => setDialog("reprogramar")}>
              Reprogramar
            </ActionButton>
          )}
          {!esConsulta && !isTerminal && (
            <ActionButton disabled={busy} onClick={() => changeVisit("asistio")}>
              Asistió
            </ActionButton>
          )}
          {!esConsulta && !isTerminal && (
            <ActionButton disabled={busy} onClick={() => changeVisit("no_asistio")}>
              No asistió
            </ActionButton>
          )}
          {!esConsulta && !isTerminal && (
            <ActionButton tone="danger" disabled={busy} onClick={() => setDialog("cancelar")}>
              Cancelar visita
            </ActionButton>
          )}
          {canRelease && (
            <ActionButton disabled={busy} onClick={() => run(() => release.mutateAsync(lead.id))}>
              Liberar
            </ActionButton>
          )}
        </div>
        {unclaimed && !isTerminal && !esConsulta && (
          <p className="mt-2 text-[11px] text-muted">
            Si confirmás o cambiás la visita de un lead libre, queda asignado a vos.
          </p>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold text-ink">Contacto</h2>
        <div className="mt-1 divide-y divide-line-soft">
          <ContactRow label="WhatsApp">
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="font-medium">
                {lead.phone}
              </a>
            ) : (
              (lead.phone ?? "…")
            )}
          </ContactRow>
          <ContactRow label="Correo">
            {lead.email ? (
              <a href={`mailto:${lead.email}`} className="font-medium">
                {lead.email}
              </a>
            ) : (
              "…"
            )}
          </ContactRow>
        </div>
        {lead.observations && (
          <p className="mt-3 whitespace-pre-line rounded-md bg-bg-subtle px-3 py-2 text-sm text-ink-soft">
            <span className="mb-0.5 block text-xs font-medium text-muted">Observaciones del formulario</span>
            {lead.observations}
          </p>
        )}
      </div>

      {attributionRows.length > 0 && (
        <div className="mt-4 rounded-xl border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold text-ink">Origen de campaña</h2>
          <div className="mt-1 divide-y divide-line-soft">
            {attributionRows.map(([label, value]) => (
              <ContactRow key={label} label={label}>
                <span title={value}>{value}</span>
              </ContactRow>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-line bg-surface p-5">
        <label className="mb-1 block text-sm font-semibold text-ink">Etapa comercial</label>
        <select
          value={lead.stage}
          disabled={busy}
          onChange={(e) => run(() => setStage.mutateAsync({ id: lead.id, stage: e.target.value as LeadStage }))}
          className="w-full rounded-md border border-line px-2.5 py-2 text-sm text-ink-soft focus:border-brand focus:outline-none"
        >
          {pipelineStages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {footer}

      {dialog === "reprogramar" && lead.visitAt && (
        <RescheduleDialog
          currentVisitAt={lead.visitAt}
          pending={setVisit.isPending}
          onSubmit={(visitAt, note) =>
            run(() => setVisit.mutateAsync({ id: lead.id, status: "reprogramada", visitAt, note }))
          }
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "cancelar" && (
        <ConfirmDialog
          title="Cancelar visita"
          message={`¿Cancelar la visita de ${lead.contactName}? Podés dejar una nota en el historial después.`}
          confirmLabel="Cancelar visita"
          pending={setVisit.isPending}
          onConfirm={() => changeVisit("cancelada")}
          onClose={() => setDialog(null)}
        />
      )}
    </section>
  );
}
