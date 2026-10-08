"use client";

import { useState } from "react";
import { pipelineStages } from "@/lib/mock-data";
import type { InboxConversation } from "@/lib/lydia-api/inbox-types";
import { CHANNEL_META } from "@/lib/lydia-api/channel";
import type { PipelineStageId } from "@/lib/types";
import { Icon } from "@/components/icons";
import { LYDIA_API_ENABLED } from "@/lib/lydia-api/config";
import { ContactAvatar } from "@/components/ContactAvatar";
import { useAgents, useAssignAgent } from "@/lib/queries/conversations";
import { useCreateLead, useLeads, useUpdateLead } from "@/lib/queries/leads";
import { NotesSection } from "./NotesSection";
import { AgentAssistantPanel } from "./AgentAssistantPanel";

export type SidePanelView = "detalle" | "agente";

interface Props {
  conversation: InboxConversation;
  // LYD-73: el panel ya no se colapsa -- alterna entre el detalle del lead y
  // el chat con el agente IA.
  view: SidePanelView;
  onViewChange: (view: SidePanelView) => void;
  agentRequestId: number;
  onUseSuggestion: (text: string) => void;
}

const VIEWS: {
  id: SidePanelView;
  label: string;
  icon: "persona" | "chispa";
}[] = [
  { id: "detalle", label: "Detalle", icon: "persona" },
  { id: "agente", label: "Agente IA", icon: "chispa" },
];

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="truncate text-ink-soft">
        {value?.trim() ? value : "..."}
      </span>
    </div>
  );
}

export function LeadDetailPanel({
  conversation,
  view,
  onViewChange,
  agentRequestId,
  onUseSuggestion,
}: Props) {
  const { contact, assignee } = conversation;

  const { data: agents = [] } = useAgents();
  const assignAgent = useAssignAgent(conversation.id);
  const canUseBackend =
    LYDIA_API_ENABLED && conversation.remoteJid !== undefined;
  const canReassign = canUseBackend;

  // LYD-20: "Estado lead" y "Presupuesto" antes eran controles decorativos
  // (estado local que se perdia al cambiar de chat, ni siquiera intentaban
  // persistir). Ahora se ligan al Lead real de pipeline (LYD-8) -- a lo
  // sumo un Lead por Chat (chatId es @unique), se crea recien cuando el
  // agente toca alguno de los dos campos por primera vez.
  const { data: leads = [], isLoading: leadLoading } = useLeads({
    chatId: canUseBackend ? conversation.id : undefined,
  });
  const lead = leads[0] ?? null;
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();

  const [draftStage, setDraftStage] =
    useState<PipelineStageId>("contacto_inicial");
  const [draftBudget, setDraftBudget] = useState("");
  const [syncedFromLead, setSyncedFromLead] = useState(false);

  if (canUseBackend && !leadLoading && !syncedFromLead) {
    setSyncedFromLead(true);
    if (lead) {
      setDraftStage(lead.stage);
      setDraftBudget(lead.budgetAmount ? String(lead.budgetAmount) : "");
    }
  }

  const stageIndex = pipelineStages.findIndex((s) => s.id === draftStage);
  const isSavingLead = createLead.isPending || updateLead.isPending;

  const persistLead = (patch: {
    stage?: PipelineStageId;
    budgetAmount?: number;
  }) => {
    if (!canUseBackend) return;
    if (lead) {
      updateLead.mutate({ id: lead.id, data: patch });
    } else {
      createLead.mutate({
        contactName: contact.name,
        source: CHANNEL_META[conversation.inboxChannel].label,
        chatId: conversation.id,
        stage: patch.stage,
        budgetAmount: patch.budgetAmount,
      });
    }
  };

  const handleStageChange = (newStage: PipelineStageId) => {
    setDraftStage(newStage);
    persistLead({ stage: newStage });
  };

  const handleBudgetBlur = () => {
    if (!canUseBackend) return;
    const amount = Number(draftBudget.replace(/[^0-9.]/g, "")) || 0;
    if (lead && amount === lead.budgetAmount) return;
    persistLead({ budgetAmount: amount });
  };

  return (
    <section className="flex h-full w-80 shrink-0 flex-col overflow-y-auto border-r border-line bg-surface p-4">
      <div
        role="tablist"
        className="flex shrink-0 rounded-lg bg-bg-subtle p-0.5"
      >
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={view === v.id}
            onClick={() => onViewChange(v.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-colors ${
              view === v.id
                ? "bg-surface text-brand shadow-sm"
                : "text-muted hover:text-ink-soft"
            }`}
          >
            <Icon name={v.icon} size={14} />
            {v.label}
          </button>
        ))}
      </div>

      {view === "agente" ? (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <AgentAssistantPanel
            conversationId={conversation.id}
            initialTags={conversation.agentTags}
            canUseBackend={canUseBackend}
            requestId={agentRequestId}
            onUseSuggestion={onUseSuggestion}
          />
        </div>
      ) : (
        <div className="mt-2">
          <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-brand">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{
                backgroundColor: CHANNEL_META[conversation.inboxChannel].color,
              }}
            />
            {CHANNEL_META[conversation.inboxChannel].label}
          </p>
          <p className="text-xs text-muted">
            Canal por donde llegó la conversación
          </p>

          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium text-muted">
              Estado lead
            </label>
            <select
              value={draftStage}
              disabled={!canUseBackend || isSavingLead}
              onChange={(e) =>
                handleStageChange(e.target.value as PipelineStageId)
              }
              className="w-full rounded-md border border-line px-2.5 py-2 text-sm text-ink-soft focus:border-brand focus:outline-none"
            >
              {pipelineStages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>

            <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
              {pipelineStages.map((s, i) => (
                <div
                  key={s.id}
                  className={`h-full flex-1 ${i <= stageIndex ? s.color : "bg-bg-subtle"} ${
                    i > 0 ? "ml-0.5" : ""
                  }`}
                />
              ))}
            </div>
            {!canUseBackend && (
              <p className="mt-1 text-[11px] text-muted">
                Solo se guarda con el backend conectado.
              </p>
            )}
          </div>

          <div className="mt-4 border-t border-line-soft pt-3">
            <label className="mb-1 block text-xs font-medium text-muted">
              Presupuesto
            </label>
            <input
              type="text"
              value={draftBudget}
              disabled={!canUseBackend || isSavingLead}
              onChange={(e) => setDraftBudget(e.target.value)}
              onBlur={handleBudgetBlur}
              placeholder="S/"
              className="w-full rounded-md border border-line px-2.5 py-2 text-sm text-ink-soft focus:border-brand focus:outline-none"
            />
          </div>

          <div className="mt-4 flex items-center gap-2 border-t border-line-soft pt-4">
            <ContactAvatar
              seed={contact.lydiaContactId}
              avatarUrl={contact.avatarUrl}
              className="h-9 w-9"
            />
            <div>
              <p className="text-sm font-semibold text-ink">{contact.name}</p>
              <p className="flex items-center gap-1 text-xs text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Brittany Group
              </p>
            </div>
          </div>

          <div className="mt-2 divide-y divide-line-soft">
            <Field label="Teléfono" value={contact.phone} />
            <Field label="Correo" value={contact.email} />
          </div>

          <div className="mt-4 border-t border-line-soft pt-4">
            <label className="mb-1 block text-xs font-medium text-muted">
              Usuario responsable
            </label>
            {canReassign ? (
              <select
                value={assignee?.id ?? ""}
                disabled={assignAgent.isPending}
                onChange={(e) => assignAgent.mutate(e.target.value || null)}
                className="w-full rounded-md border border-line px-2.5 py-2 text-sm text-ink-soft focus:border-brand focus:outline-none"
              >
                <option value="">Sin asignar</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                    {agent.role === "administrador" ? " (admin)" : ""}
                  </option>
                ))}
              </select>
            ) : assignee ? (
              <p className="flex items-center gap-1.5 text-sm text-ink-soft">
                <span className="h-2 w-2 rounded-full bg-brand" />
                {assignee.name}
              </p>
            ) : (
              <p className="text-sm text-muted">Sin asignar</p>
            )}
            {!canReassign && (
              <p className="mt-1 text-[11px] text-muted">
                Reasignar desde acá: solo disponible con el backend conectado.
              </p>
            )}
          </div>

          <NotesSection
            conversationId={conversation.id}
            canUseNotes={canUseBackend}
          />
        </div>
      )}
    </section>
  );
}
