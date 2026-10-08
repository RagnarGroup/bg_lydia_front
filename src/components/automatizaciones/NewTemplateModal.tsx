"use client";

import { useState } from "react";
import type { TemplateGroup } from "@/lib/types";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";

export interface NewTemplateData {
  groupId: string | null; // null = crear grupo nuevo con newGroupTitle
  newGroupTitle: string;
  command: string;
  label: string;
  body: string;
}

interface Props {
  groups: TemplateGroup[];
  onClose: () => void;
  onCreate: (data: NewTemplateData) => void;
}

export function NewTemplateModal({ groups, onClose, onCreate }: Props) {
  const [groupId, setGroupId] = useState<string>(groups[0]?.id ?? "__new__");
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [command, setCommand] = useState("");
  const [label, setLabel] = useState("");
  const [body, setBody] = useState("");

  useEscapeKey(true, onClose);

  const isNewGroup = groupId === "__new__";
  const canSubmit = command.trim() && label.trim() && body.trim() && (!isNewGroup || newGroupTitle.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onCreate({
      groupId: isNewGroup ? null : groupId,
      newGroupTitle: newGroupTitle.trim(),
      command: command.trim().startsWith("/") ? command.trim() : `/${command.trim()}`,
      label: label.trim(),
      body: body.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 cursor-default" />
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-template-modal-title"
        className="relative w-full max-w-md rounded-xl bg-surface p-5 shadow-xl"
      >
        <h2 id="new-template-modal-title" className="text-base font-semibold text-ink">
          Nueva plantilla
        </h2>

        <div className="mt-4 flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Grupo *</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full rounded-md border border-line px-2.5 py-2 text-sm focus:border-brand focus:outline-none"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
              <option value="__new__">+ Crear grupo nuevo</option>
            </select>
          </div>

          {isNewGroup && (
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-soft">Nombre del grupo nuevo *</label>
              <input
                autoFocus
                value={newGroupTitle}
                onChange={(e) => setNewGroupTitle(e.target.value)}
                type="text"
                placeholder="Ej. Plantillas"
                className="w-full rounded-md border border-line px-2.5 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Comando *</label>
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              type="text"
              placeholder="Ej. /precios adultos"
              className="w-full rounded-md border border-line px-2.5 py-2 text-sm focus:border-brand focus:outline-none"
            />
            <p className="mt-1 text-xs text-muted">
              Lo que se escribe en el composer después de &quot;/&quot; para insertarla.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Etiqueta *</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              type="text"
              placeholder="Ej. Precios adultos"
              className="w-full rounded-md border border-line px-2.5 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Texto de la plantilla *</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="El mensaje completo que se va a insertar"
              className="w-full resize-none rounded-md border border-line px-2.5 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
        </div>

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
            Crear plantilla
          </button>
        </div>
      </form>
    </div>
  );
}
