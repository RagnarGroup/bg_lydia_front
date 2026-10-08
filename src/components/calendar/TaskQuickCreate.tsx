"use client";

import { useState } from "react";
import { agents } from "@/lib/mock-data";
import type { CalendarEventType } from "@/lib/types";
import { Icon } from "@/components/icons";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";

const typeOptions: { id: CalendarEventType; label: string; badge?: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "nota", label: "Nota" },
  { id: "tarea", label: "Tarea" },
  { id: "reserva", label: "Reserva", badge: "Nuevo" },
];

const noteLabelByType: Record<CalendarEventType, string> = {
  chat: "Mensaje",
  nota: "Nota",
  tarea: "Seguimiento",
  reserva: "Detalle",
};

export interface QuickTask {
  id: string;
  type: CalendarEventType;
  day: "hoy" | "mañana";
  agentId: string;
  note: string;
}

interface Props {
  onCreate: (task: QuickTask) => void;
}

export function TaskQuickCreate({ onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  useEscapeKey(typeMenuOpen, () => setTypeMenuOpen(false));
  const [type, setType] = useState<CalendarEventType>("tarea");
  const [day, setDay] = useState<"hoy" | "mañana">("mañana");
  const [agentId, setAgentId] = useState(agents[0].id);
  const [note, setNote] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent-dark hover:bg-accent/20"
      >
        <Icon name="calendario" size={16} />
        No hay tareas. <span className="font-semibold underline">Crear una</span>
      </button>
    );
  }

  const handleSubmit = () => {
    if (!note.trim()) return;
    onCreate({ id: `task-${Date.now()}`, type, day, agentId, note: note.trim() });
    setNote("");
    setOpen(false);
  };

  return (
    <div className="w-full max-w-lg rounded-lg border border-line bg-surface p-3 shadow-sm">
      <div className="relative">
        <button
          type="button"
          onClick={() => setTypeMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={typeMenuOpen}
          className="mb-2 flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-bg-subtle"
        >
          {typeOptions.find((t) => t.id === type)?.label}
          <Icon name="chevronDown" size={12} strokeWidth={2} />
        </button>
        {typeMenuOpen && (
          <div
            role="menu"
            className="absolute left-0 z-10 mt-1 w-40 rounded-md border border-line bg-surface py-1 text-sm shadow-lg"
          >
            {typeOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setType(opt.id);
                  setTypeMenuOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-ink-soft hover:bg-bg-subtle"
              >
                <span>{opt.label}</span>
                <span className="flex items-center gap-1.5">
                  {opt.badge && (
                    <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                      {opt.badge}
                    </span>
                  )}
                  {opt.id === type && <span className="text-brand">✓</span>}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-sm text-ink-soft">
        <span className="font-semibold text-ink">{typeOptions.find((t) => t.id === type)?.label}</span>
        <span>para</span>
        <select
          value={day}
          onChange={(e) => setDay(e.target.value as "hoy" | "mañana")}
          className="border-b border-line bg-transparent font-medium text-brand focus:outline-none"
        >
          <option value="hoy">Hoy</option>
          <option value="mañana">Mañana</option>
        </select>
        <span>para</span>
        <select
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          className="border-b border-line bg-transparent font-medium text-brand focus:outline-none"
        >
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
        <span>:</span>
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-sm">
        <span className="font-semibold text-ink">{noteLabelByType[type]}:</span>
        <input
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          type="text"
          placeholder="Escribí el detalle..."
          className="flex-1 border-b border-line bg-transparent py-1 text-ink-soft focus:border-brand focus:outline-none"
        />
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-bg-subtle"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!note.trim()}
          className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-muted-2"
        >
          Crear
        </button>
      </div>
    </div>
  );
}
