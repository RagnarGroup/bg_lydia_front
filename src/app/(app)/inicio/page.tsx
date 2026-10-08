"use client";

import Link from "next/link";
import {
  conversations as mockConversations,
  getAgentById,
  getLeadByConversationId,
  getLeadsByStage,
  leads as mockLeads,
  pipelineStages,
  sumBudget,
} from "@/lib/mock-data";
import type { Lead } from "@/lib/types";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import { Icon, type IconName } from "@/components/icons";
import { LYDIA_API_ENABLED } from "@/lib/lydia-api/config";
import { ContactAvatar } from "@/components/ContactAvatar";
import { useConversations } from "@/lib/queries/conversations";
import { useLeads } from "@/lib/queries/leads";
import { useAuth } from "@/components/providers/AuthProvider";

function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: IconName;
  tone: "brand" | "danger" | "success";
}) {
  const toneClass = {
    brand: "bg-brand/10 text-brand",
    danger: "bg-danger/10 text-danger",
    success: "bg-success/10 text-success",
  }[tone];

  return (
    <div title={hint} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3.5 py-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${toneClass}`}>
        <Icon name={icon} size={18} />
      </div>
      <div className="min-w-0 leading-tight">
        <p className="text-xl font-bold text-ink">{value}</p>
        <p className="truncate text-xs text-ink-soft">{label}</p>
      </div>
    </div>
  );
}

export default function InicioPage() {
  const { agent } = useAuth();
  const { data: realConversations = [], error: conversationsError } = useConversations();
  const { data: realLeads = [], error: leadsError } = useLeads();
  const isMockMode = !LYDIA_API_ENABLED || conversationsError !== null || leadsError !== null;

  const leadList: Lead[] = isMockMode ? mockLeads : realLeads;

  const sinRespuesta = isMockMode
    ? mockConversations.filter((c) => c.status === "sin_respuesta").length
    : realConversations.filter((c) => c.status === "sin_respuesta").length;
  const abiertos = isMockMode
    ? mockConversations.filter((c) => c.status !== "cerrado").length
    : realConversations.filter((c) => c.status !== "cerrado").length;
  const matriculados = leadList.filter((l) => l.stage === "matriculado").length;
  const pipelineActivo = leadList.filter((l) => l.stage !== "matriculado" && l.stage !== "venta_perdida");

  const distribucion = pipelineStages.map((stage) => ({
    stage,
    count: getLeadsByStage(leadList, stage.id).length,
  }));

  const nombreSaludo = isMockMode ? "Mafer" : (agent?.name ?? "");

  return (
    <section className="scroll-slim flex h-full flex-1 flex-col overflow-y-auto bg-bg px-8 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink">Hola, {nombreSaludo}</h1>
          <p className="mt-1 text-sm text-ink-soft">Esto es lo que está pasando hoy en Lydia.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/pipelines/embudo-chats"
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-bg-subtle"
          >
            Ver pipeline
          </Link>
          <Link
            href="/comunicaciones/inbox-chat"
            className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Ir al inbox
            <Icon name="flecha" size={15} />
          </Link>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Leads totales" value={String(leadList.length)} icon="tabla" tone="brand" />
        <StatCard
          label="Chats sin responder"
          value={String(sinRespuesta)}
          hint="Revisalos antes que se enfríen"
          icon="chat"
          tone="danger"
        />
        <StatCard label="Chats abiertos" value={String(abiertos)} icon="bandeja" tone="brand" />
        <StatCard
          label="Matriculados"
          value={String(matriculados)}
          hint="En todas las etapas cerradas"
          icon="embudo"
          tone="success"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-lg border border-line bg-gradient-to-br from-brand/5 to-accent/5 px-card-x py-card-y lg:col-span-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/10 text-accent-dark">
            <Icon name="rayo" size={18} />
          </div>
          <p className="mt-3 text-sm text-ink-soft">Presupuesto en pipeline activo</p>
          <p className="text-3xl font-bold text-ink">{formatCurrency(sumBudget(pipelineActivo))}</p>
          <p className="mt-1 text-xs text-muted">
            Suma de {pipelineActivo.length} leads que todavía no llegaron a Matriculado ni Venta Perdida
          </p>
        </div>

        <div className="rounded-lg border border-line bg-surface px-card-x py-card-y lg:col-span-3">
          <p className="text-sm font-semibold text-ink">Distribución del pipeline</p>
          <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-bg-subtle">
            {distribucion.map(({ stage, count }) =>
              count === 0 ? null : (
                <div
                  key={stage.id}
                  className={stage.color}
                  style={{ width: `${(count / (leadList.length || 1)) * 100}%` }}
                  title={`${stage.label}: ${count}`}
                />
              ),
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
            {distribucion.map(({ stage, count }) => (
              <div key={stage.id} className="flex items-center gap-1.5 text-xs text-ink-soft">
                <span className={`h-2 w-2 shrink-0 rounded-full ${stage.color}`} />
                <span className="truncate">{stage.label}</span>
                <span className="ml-auto font-semibold text-ink">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Actividad reciente</h2>
          <Link href="/comunicaciones/inbox-chat" className="text-sm font-semibold text-brand hover:text-brand-dark">
            Ver todo el inbox
          </Link>
        </div>

        <div className="mt-3 divide-y divide-line-soft rounded-lg border border-line bg-surface">
          {isMockMode
            ? [...mockConversations]
                .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
                .slice(0, 5)
                .map((conversation) => {
                  const lead = getLeadByConversationId(conversation.id);
                  const agent = getAgentById(conversation.assignedAgentId);
                  if (!lead) return null;
                  return (
                    <Link
                      key={conversation.id}
                      href="/comunicaciones/inbox-chat"
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-bg-subtle"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${
                            agent?.color ?? "bg-muted-2"
                          }`}
                        >
                          {lead.contactName.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink">{lead.contactName}</p>
                          <p className="truncate text-ink-soft">{conversation.lastMessagePreview}</p>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-muted">
                        {formatRelativeTime(conversation.lastMessageAt)}
                      </span>
                    </Link>
                  );
                })
            : [...realConversations]
                .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
                .slice(0, 5)
                .map((conversation) => (
                  <Link
                    key={conversation.id}
                    href="/comunicaciones/inbox-chat"
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-bg-subtle"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <ContactAvatar
                        seed={conversation.contact.lydiaContactId}
                        avatarUrl={conversation.contact.avatarUrl}
                        className="h-8 w-8"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{conversation.contact.name}</p>
                        <p className="truncate text-ink-soft">{conversation.lastMessagePreview}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-muted">
                      {formatRelativeTime(conversation.lastMessageAt)}
                    </span>
                  </Link>
                ))}
        </div>
      </div>
    </section>
  );
}
