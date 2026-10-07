"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import {
  useAgentInstructions,
  useAgentKnowledge,
  useCreateAgentKnowledge,
  useDeleteAgentKnowledge,
  useSetAgentInstructions,
  useTestAgent,
  useUpdateAgentKnowledge,
  type AgentKnowledgeInput,
} from "@/lib/queries/agent";
import {
  AGENT_KNOWLEDGE_CATEGORIES,
  type AgentKnowledgeCategory,
  type EvoAgentKnowledge,
} from "@/lib/lydia-api/types";

const CATEGORY_LABELS: Record<AgentKnowledgeCategory, string> = {
  programas: "Programas",
  precios: "Precios",
  horarios: "Horarios",
  promociones: "Promociones",
  preguntas_frecuentes: "Preguntas frecuentes",
  tono: "Tono",
  otro: "Otro",
};

const inputClass =
  "w-full rounded-md border border-line px-2.5 py-2 text-sm focus:border-brand focus:outline-none";

// LYD-69: seccion "Agente" -- conocimiento editable, instrucciones y prueba de
// la sugerencia de respuesta con IA. Solo para administradores (el chequeo real
// esta en los route handlers /api/lydia/agent/*).
export function AgentePanel() {
  const { agent } = useAuth();

  if (agent && agent.role !== "administrador") {
    return (
      <section className="flex h-full flex-1 items-center justify-center bg-bg px-8">
        <p className="text-sm text-muted">
          Esta sección es solo para administradores.
        </p>
      </section>
    );
  }

  return (
    <section className="scroll-slim flex h-full flex-1 flex-col gap-8 overflow-y-auto bg-bg px-8 py-6">
      <KnowledgeSection />
      <InstructionsSection />
      <TestSection />
    </section>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
        {title}
      </h2>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger"
    >
      {message}
    </p>
  );
}

function KnowledgeSection() {
  const { data: entries = [], isLoading, error } = useAgentKnowledge();
  const update = useUpdateAgentKnowledge();
  const remove = useDeleteAgentKnowledge();
  const [editing, setEditing] = useState<EvoAgentKnowledge | "new" | null>(
    null,
  );
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <SectionTitle
          title="Conocimiento"
          hint="Lo que la IA puede usar al sugerir respuestas. Desactiva una entrada (por ejemplo, una promoción terminada) y deja de usarse sin borrarla."
        />
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="shrink-0 rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          + Nueva entrada
        </button>
      </div>

      {error && <ErrorBox message={error.message} />}
      {(update.isError || remove.isError) && (
        <ErrorBox
          message={
            (update.error ?? remove.error)?.message ??
            "No se pudo completar la acción"
          }
        />
      )}

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="w-24 border-b border-line py-2.5 pl-4">Activo</th>
              <th className="border-b border-line py-2.5 pr-4">Título</th>
              <th className="border-b border-line py-2.5 pr-4">Categoría</th>
              <th className="border-b border-line py-2.5 pr-4">Contenido</th>
              <th className="w-32 border-b border-line py-2.5 pr-4" />
            </tr>
          </thead>
          <tbody>
            {!isLoading && entries.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="border-b border-line-soft py-6 text-center text-sm text-muted"
                >
                  Todavía no hay entradas. Mientras tanto, la IA usa las
                  plantillas de chat y la conversación abierta.
                </td>
              </tr>
            )}
            {entries.map((entry) => (
              <tr key={entry.id} className={entry.active ? "" : "opacity-60"}>
                <td className="border-b border-line-soft py-2.5 pl-4">
                  <input
                    type="checkbox"
                    checked={entry.active}
                    disabled={update.isPending}
                    onChange={(e) =>
                      update.mutate({ id: entry.id, active: e.target.checked })
                    }
                    aria-label={
                      entry.active ? "Desactivar entrada" : "Activar entrada"
                    }
                    className="accent-brand"
                  />
                </td>
                <td className="border-b border-line-soft py-2.5 pr-4 font-medium text-ink-soft">
                  {entry.title}
                </td>
                <td className="border-b border-line-soft py-2.5 pr-4">
                  <span className="rounded-md bg-bg-subtle px-2 py-0.5 text-xs font-medium text-muted">
                    {CATEGORY_LABELS[entry.category] ?? entry.category}
                  </span>
                </td>
                <td
                  className="max-w-sm truncate border-b border-line-soft py-2.5 pr-4 text-muted"
                  title={entry.content}
                >
                  {entry.content}
                </td>
                <td className="border-b border-line-soft py-2.5 pr-4 text-right">
                  {confirmingDelete === entry.id ? (
                    <span className="inline-flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          remove.mutate(entry.id);
                          setConfirmingDelete(null);
                        }}
                        className="font-semibold text-danger hover:underline"
                      >
                        Sí, borrar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingDelete(null)}
                        className="text-muted hover:underline"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => setEditing(entry)}
                        className="text-brand hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingDelete(entry.id)}
                        className="text-muted hover:text-danger"
                      >
                        Borrar
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <KnowledgeModal
          entry={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function KnowledgeModal({
  entry,
  onClose,
}: {
  entry: EvoAgentKnowledge | null;
  onClose: () => void;
}) {
  const create = useCreateAgentKnowledge();
  const update = useUpdateAgentKnowledge();
  const [title, setTitle] = useState(entry?.title ?? "");
  const [category, setCategory] = useState<AgentKnowledgeCategory>(
    entry?.category ?? "programas",
  );
  const [content, setContent] = useState(entry?.content ?? "");
  const [active, setActive] = useState(entry?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const saving = create.isPending || update.isPending;

  useEscapeKey(true, onClose);

  const canSubmit = title.trim() && content.trim() && !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    const data: AgentKnowledgeInput = {
      title: title.trim(),
      category,
      content: content.trim(),
      active,
    };
    try {
      if (entry) await update.mutateAsync({ id: entry.id, ...data });
      else await create.mutateAsync(data);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar la entrada",
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="knowledge-modal-title"
        className="relative w-full max-w-lg rounded-xl bg-surface p-5 shadow-xl"
      >
        <h2
          id="knowledge-modal-title"
          className="text-base font-semibold text-ink"
        >
          {entry ? "Editar entrada" : "Nueva entrada de conocimiento"}
        </h2>

        <div className="mt-4 flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">
              Título *
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
              type="text"
              placeholder="Ej.: Promoción de octubre"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">
              Categoría *
            </label>
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as AgentKnowledgeCategory)
              }
              className={inputClass}
            >
              {AGENT_KNOWLEDGE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">
              Contenido *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              spellCheck
              lang="es"
              className={`${inputClass} resize-none`}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="accent-brand"
            />
            Activa (la IA puede usarla)
          </label>
        </div>

        {error && (
          <div className="mt-3">
            <ErrorBox message={error} />
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-bg-subtle"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-muted-2"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function InstructionsSection() {
  const { data, error } = useAgentInstructions();
  const save = useSetAgentInstructions();
  // null = sin ediciones locales todavia: el textarea muestra lo guardado.
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? data?.instructions ?? "";

  const dirty = data !== undefined && draft !== null && draft.trim() !== data.instructions.trim();

  const handleSave = async () => {
    await save.mutateAsync(text);
    setDraft(null);
  };

  const handleReset = async () => {
    await save.mutateAsync("");
    setDraft(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle
        title="Instrucciones del agente"
        hint="Rol, estilo y reglas con las que la IA redacta las sugerencias. Los cambios aplican a la siguiente sugerencia."
      />
      {error && <ErrorBox message={error.message} />}
      {save.isError && <ErrorBox message={save.error.message} />}
      <textarea
        value={text}
        onChange={(e) => setDraft(e.target.value)}
        rows={12}
        spellCheck
        lang="es"
        disabled={!data}
        className={`${inputClass} resize-y bg-surface`}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {data?.isDefault
            ? "Usando las instrucciones por defecto."
            : `Editadas${data?.updatedBy ? ` por ${data.updatedBy}` : ""}.`}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={!data || data.isDefault || save.isPending}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-50"
          >
            Restablecer
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || save.isPending}
            className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-muted-2"
          >
            {save.isPending ? "Guardando…" : "Guardar instrucciones"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TestSection() {
  const test = useTestAgent();
  const [message, setMessage] = useState("");

  return (
    <div className="flex flex-col gap-3 pb-6">
      <SectionTitle
        title="Probar"
        hint="Escribe un mensaje como si fuera de un cliente y mira qué sugeriría la IA con lo que está activo arriba. No se envía nada a nadie."
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        spellCheck
        lang="es"
        placeholder="Ej.: Hola, ¿qué promociones tienen para el curso de inglés para adultos?"
        className={`${inputClass} resize-none bg-surface`}
      />
      <div>
        <button
          type="button"
          onClick={() => test.mutate(message.trim())}
          disabled={!message.trim() || test.isPending}
          className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-muted-2"
        >
          {test.isPending ? "Generando…" : "Generar sugerencia"}
        </button>
      </div>
      {test.isError && <ErrorBox message={test.error.message} />}
      {test.data && (
        <div className="whitespace-pre-wrap rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink-soft">
          {test.data.suggestion}
        </div>
      )}
    </div>
  );
}
