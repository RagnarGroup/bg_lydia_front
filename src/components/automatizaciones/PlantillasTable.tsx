"use client";

import { useMemo, useState } from "react";
import { templateGroups as mockTemplateGroups } from "@/lib/mock-data";
import type { TemplateGroup } from "@/lib/types";
import { LYDIA_API_ENABLED } from "@/lib/lydia-api/config";
import {
  useCreateTemplate,
  useCreateTemplateGroup,
  useTemplateGroups,
  useUpdateTemplate,
} from "@/lib/queries/template-groups";
import { NewTemplateModal, type NewTemplateData } from "./NewTemplateModal";
import { EditTemplateModal, type EditTemplateData } from "./EditTemplateModal";

interface Row {
  key: string;
  id?: string; // ausente en datos mock
  groupId: string;
  groupTitle: string;
  command: string;
  label: string;
  body: string;
}

function flatten(groups: TemplateGroup[]): Row[] {
  return groups.flatMap((group) =>
    group.templates.map((t) => ({
      key: `${group.id}-${t.command}`,
      id: t.id,
      groupId: group.id,
      groupTitle: group.title,
      command: t.command,
      label: t.label,
      body: t.body,
    })),
  );
}

export function PlantillasTable() {
  const { data: realGroups = [], error: groupsError } = useTemplateGroups();
  const isMockMode = !LYDIA_API_ENABLED || groupsError !== null;
  const createGroup = useCreateTemplateGroup();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();

  // Modo mock: mismo estado local editable que antes de LYD-10, pero sobre
  // el modelo real (TemplateGroup/QuickReplyTemplate) -- ya no existe
  // ChatTemplate, que no tenia campo body y no calzaba con lo que Composer.tsx
  // realmente inserta.
  const [mockGroups, setMockGroups] = useState<TemplateGroup[]>(mockTemplateGroups);
  const groups = isMockMode ? mockGroups : realGroups;
  const rows = useMemo(() => flatten(groups), [groups]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  // LYD-46: fila seleccionada para editar.
  const [editing, setEditing] = useState<Row | null>(null);

  const allSelected = selected.size > 0 && selected.size === rows.length;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.key)));
  };

  const toggleOne = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleCreate = async (data: NewTemplateData) => {
    if (isMockMode) {
      setMockGroups((prev) => {
        if (data.groupId) {
          return prev.map((g) =>
            g.id === data.groupId
              ? { ...g, templates: [{ command: data.command, label: data.label, body: data.body }, ...g.templates] }
              : g,
          );
        }
        return [
          {
            id: `tg-local-${Date.now()}`,
            title: data.newGroupTitle,
            templates: [{ command: data.command, label: data.label, body: data.body }],
          },
          ...prev,
        ];
      });
      setModalOpen(false);
      return;
    }

    const groupId = data.groupId ?? (await createGroup.mutateAsync(data.newGroupTitle)).group.id;
    await createTemplate.mutateAsync({ groupId, command: data.command, label: data.label, body: data.body });
    setModalOpen(false);
  };

  const handleEdit = async (data: EditTemplateData) => {
    if (!editing) return;
    if (isMockMode) {
      setMockGroups((prev) =>
        prev.map((g) =>
          g.id === editing.groupId
            ? { ...g, templates: g.templates.map((t) => (t.command === editing.command ? { ...t, ...data } : t)) }
            : g,
        ),
      );
      setEditing(null);
      return;
    }
    if (!editing.id) throw new Error("La plantilla no tiene id, recargá la página e intentá de nuevo");
    await updateTemplate.mutateAsync({ id: editing.id, ...data });
    setEditing(null);
  };

  return (
    <section className="scroll-slim flex h-full flex-1 flex-col overflow-y-auto bg-bg px-8 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Plantillas de chat</h1>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          + Nueva plantilla
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="w-10 border-b border-line py-2.5 pl-4">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-brand" />
              </th>
              <th className="border-b border-line py-2.5 pr-4">Comando</th>
              <th className="border-b border-line py-2.5 pr-4">Etiqueta</th>
              <th className="border-b border-line py-2.5 pr-4">Grupo</th>
              <th className="border-b border-line py-2.5 pr-4">Texto</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="border-b border-line-soft py-6 text-center text-sm text-muted">
                  Todavía no hay plantillas.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr
                key={row.key}
                tabIndex={0}
                onClick={() => setEditing(row)}
                onKeyDown={(e) => {
                  if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    setEditing(row);
                  }
                }}
                title="Click para editar"
                className="cursor-pointer hover:bg-bg-subtle focus:bg-bg-subtle focus:outline-none"
              >
                <td className="border-b border-line-soft py-2.5 pl-4" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(row.key)}
                    onChange={() => toggleOne(row.key)}
                    className="accent-brand"
                  />
                </td>
                <td className="border-b border-line-soft py-2.5 pr-4 font-medium text-accent-dark">{row.command}</td>
                <td className="border-b border-line-soft py-2.5 pr-4 text-ink-soft">{row.label}</td>
                <td className="border-b border-line-soft py-2.5 pr-4">
                  <span className="rounded-md bg-bg-subtle px-2 py-0.5 text-xs font-medium text-muted">
                    {row.groupTitle}
                  </span>
                </td>
                <td className="max-w-xs truncate border-b border-line-soft py-2.5 pr-4 text-muted" title={row.body}>
                  {row.body}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && <NewTemplateModal groups={groups} onClose={() => setModalOpen(false)} onCreate={handleCreate} />}
      {editing && (
        <EditTemplateModal
          groupTitle={editing.groupTitle}
          initial={{ command: editing.command, label: editing.label, body: editing.body }}
          onClose={() => setEditing(null)}
          onSave={handleEdit}
        />
      )}
    </section>
  );
}
