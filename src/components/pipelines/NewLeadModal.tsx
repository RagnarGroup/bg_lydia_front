"use client";

import { useState } from "react";
import { pipelineStages } from "@/lib/mock-data";
import type { PipelineStageId } from "@/lib/types";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";

interface Props {
  initialStage: PipelineStageId;
  lockStage?: boolean;
  onClose: () => void;
  onCreate: (data: {
    contactName: string;
    phone: string;
    source: string;
    budgetAmount: number;
    stage: PipelineStageId;
  }) => void;
}

export function NewLeadModal({ initialStage, lockStage, onClose, onCreate }: Props) {
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [stage, setStage] = useState<PipelineStageId>(initialStage);

  useEscapeKey(true, onClose);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim()) return;
    onCreate({
      contactName: contactName.trim(),
      phone: phone.trim(),
      source: source.trim() || "Manual",
      budgetAmount: Number(budgetAmount) || 0,
      stage,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 cursor-default" />
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-lead-modal-title"
        className="relative w-full max-w-sm rounded-xl bg-surface p-5 shadow-xl"
      >
        <h2 id="new-lead-modal-title" className="text-base font-semibold text-ink">
          Nuevo lead
        </h2>

        <div className="mt-4 flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Nombre *</label>
            <input
              autoFocus
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              required
              type="text"
              className="w-full rounded-md border border-line px-2.5 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Teléfono</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="text"
              placeholder="+51 9XX XXX XXX"
              className="w-full rounded-md border border-line px-2.5 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Medio de origen</label>
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              type="text"
              placeholder="Facebook Ads, referido, ..."
              className="w-full rounded-md border border-line px-2.5 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Presupuesto (S/)</label>
            <input
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
              type="number"
              min="0"
              className="w-full rounded-md border border-line px-2.5 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Etapa</label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as PipelineStageId)}
              disabled={lockStage}
              className="w-full rounded-md border border-line px-2.5 py-2 text-sm focus:border-brand focus:outline-none disabled:bg-bg-subtle disabled:text-muted"
            >
              {pipelineStages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
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
            disabled={!contactName.trim()}
            className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-muted-2"
          >
            Crear lead
          </button>
        </div>
      </form>
    </div>
  );
}
