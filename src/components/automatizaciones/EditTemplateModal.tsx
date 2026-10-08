"use client";

import { useState } from "react";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";

export interface EditTemplateData {
  command: string;
  label: string;
  body: string;
}

interface Props {
  groupTitle: string;
  initial: EditTemplateData;
  onClose: () => void;
  // Puede devolver una promesa: si se rechaza, el modal queda abierto y muestra el error.
  onSave: (data: EditTemplateData) => void | Promise<void>;
}

// LYD-46: editar una plantilla existente. El grupo no se cambia desde aca.
export function EditTemplateModal({ groupTitle, initial, onClose, onSave }: Props) {
  const [command, setCommand] = useState(initial.command);
  const [label, setLabel] = useState(initial.label);
  const [body, setBody] = useState(initial.body);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEscapeKey(true, onClose);

  const canSubmit = command.trim() && label.trim() && body.trim() && !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSaving(true);
    try {
      await onSave({
        command: command.trim().startsWith("/") ? command.trim() : `/${command.trim()}`,
        label: label.trim(),
        body: body.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la plantilla");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 cursor-default" />
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-template-modal-title"
        className="relative w-full max-w-md rounded-xl bg-surface p-5 shadow-xl"
      >
        <h2 id="edit-template-modal-title" className="text-base font-semibold text-ink">
          Editar plantilla
        </h2>
        <p className="mt-0.5 text-xs text-muted">Grupo: {groupTitle}</p>

        <div className="mt-4 flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Comando *</label>
            <input
              autoFocus
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              type="text"
              className="w-full rounded-md border border-line px-2.5 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Etiqueta *</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              type="text"
              className="w-full rounded-md border border-line px-2.5 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Texto de la plantilla *</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="w-full resize-none rounded-md border border-line px-2.5 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger"
          >
            {error}
          </p>
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
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
