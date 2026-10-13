"use client";

import { useState } from "react";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { fromLimaInputValue, toLimaInputValue } from "@/lib/landing/format";
import { Icon } from "@/components/icons";

// LYD-84: dialogos modales de la seccion Landing (mismo marco que ForwardMessageDialog).

function DialogFrame({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEscapeKey(true, onClose);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm rounded-xl border border-line bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
          <p className="text-sm font-semibold text-ink">{title}</p>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-muted hover:text-ink-soft">
            <Icon name="equis" size={16} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-line px-2.5 py-2 text-sm text-ink-soft focus:border-brand focus:outline-none";

export function RescheduleDialog({
  currentVisitAt,
  pending,
  onSubmit,
  onClose,
}: {
  currentVisitAt: string;
  pending: boolean;
  onSubmit: (visitAt: string, note?: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(toLimaInputValue(currentVisitAt));
  const [note, setNote] = useState("");
  const iso = fromLimaInputValue(value);
  const unchanged = iso !== null && new Date(iso).getTime() === new Date(currentVisitAt).getTime();

  return (
    <DialogFrame title="Reprogramar visita" onClose={onClose}>
      <label className="mb-1 block text-xs font-medium text-muted">Nueva fecha y hora (hora de Lima)</label>
      <input
        type="datetime-local"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={inputClass}
      />
      <label className="mb-1 mt-3 block text-xs font-medium text-muted">Nota (opcional)</label>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Motivo de la reprogramación…"
        className={inputClass}
      />
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-bg-subtle"
        >
          Volver
        </button>
        <button
          type="button"
          disabled={!iso || unchanged || pending}
          onClick={() => iso && onSubmit(iso, note.trim() || undefined)}
          className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-muted-2"
        >
          {pending ? "Guardando…" : "Reprogramar"}
        </button>
      </div>
    </DialogFrame>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  pending,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <DialogFrame title={title} onClose={onClose}>
      <p className="text-sm text-ink-soft">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-bg-subtle"
        >
          Volver
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onConfirm}
          className="rounded-md bg-danger px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Guardando…" : confirmLabel}
        </button>
      </div>
    </DialogFrame>
  );
}
