"use client";

import { useMemo, useState } from "react";
import { describeActivity, formatLimaShort } from "@/lib/landing/format";
import { useAddLandingNote, useLandingLead } from "@/lib/queries/landing-leads";
import { AgentDot } from "./badges";

// LYD-84: panel derecho -- responsable, notas y linea de tiempo del lead.
// variant "aside": columna derecha fija desde lg. "stacked": el mismo contenido
// debajo del detalle en pantallas chicas, donde no entra la tercera columna.
export function LandingSidePanel({ leadId, variant }: { leadId: string; variant: "aside" | "stacked" }) {
  const { data: lead } = useLandingLead(leadId);
  const addNote = useAddLandingNote();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Mas reciente primero.
  const activities = useMemo(
    () => [...(lead?.activities ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [lead?.activities],
  );

  const handleAdd = async () => {
    const trimmed = content.trim();
    if (!trimmed || addNote.isPending) return;
    setError(null);
    try {
      await addNote.mutateAsync({ id: leadId, content: trimmed });
      setContent("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la nota");
    }
  };

  return (
    <section
      className={
        variant === "aside"
          ? "scroll-slim hidden h-full w-80 shrink-0 flex-col overflow-y-auto border-l border-line bg-surface p-4 lg:flex"
          : "mt-4 flex flex-col rounded-xl border border-line bg-surface p-4 lg:hidden"
      }
    >
      <label className="mb-1 block text-xs font-medium text-muted">Responsable</label>
      {lead?.assignedAgent ? (
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <AgentDot agent={lead.assignedAgent} size={26} />
          {lead.assignedAgent.name}
        </p>
      ) : (
        <p className="text-sm text-muted">Sin tomar — cualquier asesora puede tomarlo.</p>
      )}

      <div className="mt-4 border-t border-line-soft pt-4">
        <label className="mb-1 block text-xs font-medium text-muted">Agregar nota</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="Escribí una nota para el historial…"
          className="w-full resize-none rounded-md border border-line px-2.5 py-1.5 text-xs text-ink-soft focus:border-brand focus:outline-none"
        />
        {error && <p className="mt-1 text-[11px] text-danger">{error}</p>}
        <button
          type="button"
          onClick={handleAdd}
          disabled={!content.trim() || addNote.isPending}
          className="mt-1.5 w-full rounded-md bg-brand px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-muted-2"
        >
          {addNote.isPending ? "Guardando…" : "Agregar nota"}
        </button>
      </div>

      <div className="mt-4 border-t border-line-soft pt-4">
        <p className="mb-2 text-xs font-medium text-muted">Historial</p>
        {activities.length === 0 && <p className="text-xs text-muted">Sin actividad todavía.</p>}
        <ol className="relative ml-1.5 border-l border-line-soft">
          {activities.map((activity) => (
            <li key={activity.id} className="relative mb-3 pl-4">
              <span
                className={`absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                  activity.type === "nota" ? "bg-accent" : "bg-brand"
                }`}
              />
              <p className="text-xs text-ink-soft">{describeActivity(activity)}</p>
              {activity.content && (
                <p className="mt-1 whitespace-pre-line rounded-md bg-bg-subtle px-2.5 py-1.5 text-xs text-ink-soft">
                  {activity.content}
                </p>
              )}
              <p className="mt-0.5 text-[11px] text-muted">{formatLimaShort(activity.createdAt)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
