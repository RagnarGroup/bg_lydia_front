"use client";

import { useMessageDetails } from "@/lib/queries/conversations";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { formatMessageDay, formatMessageTime } from "@/lib/format";
import type { EvoDeliveryStatus, EvoMessageDetails } from "@/lib/lydia-api/types";
import { Icon } from "@/components/icons";

interface Props {
  messageId: string;
  // Nombre que trae el mensaje entrante (pushName), para "Enviado por" del cliente.
  clientName?: string;
  onClose: () => void;
}

const DELIVERY_LABEL: Record<EvoDeliveryStatus, string> = {
  pendiente: "Pendiente de envío",
  enviado: "Enviado",
  entregado: "Entregado",
  leido: "Leído",
  error: "No se pudo enviar",
};

function SenderInfo({ details, clientName }: { details: EvoMessageDetails; clientName?: string }) {
  switch (details.sender) {
    case "asesora":
      return (
        <>
          <p className="font-semibold text-ink">{details.agent?.name ?? "Asesora"}</p>
          {details.agent?.email && <p className="text-xs text-muted">{details.agent.email}</p>}
        </>
      );
    case "bot":
      return <p className="font-semibold text-ink">Bot de Lydia (respuesta automática)</p>;
    case "bienvenida":
      return <p className="font-semibold text-ink">Mensaje de bienvenida automático</p>;
    case "cliente":
      return <p className="font-semibold text-ink">{clientName ? `${clientName} (cliente)` : "El cliente"}</p>;
    default:
      return (
        <>
          <p className="font-semibold text-ink">Sin registro</p>
          <p className="mt-0.5 text-xs text-muted">
            Se envió desde el celular o antes de que Lydia empezara a registrar quién envía cada mensaje (22/10/2026).
          </p>
        </>
      );
  }
}

// LYD-105: modal de "Ver detalles" de un mensaje -- quien lo envio (autoria
// registrada por LYD-101), cuando y hasta donde llego. Mismo patron de modal
// que ForwardMessageDialog.
export function MessageDetailsDialog({ messageId, clientName, onClose }: Props) {
  const { data: details, isLoading, error } = useMessageDetails(messageId);
  useEscapeKey(true, onClose);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="message-details-title"
        className="w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
          <p id="message-details-title" className="text-sm font-semibold text-ink">
            Detalles del mensaje
          </p>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-muted hover:text-ink-soft">
            <Icon name="equis" size={16} />
          </button>
        </div>

        <div className="space-y-3 px-4 py-3 text-sm">
          {isLoading && <p className="text-xs text-muted">Cargando…</p>}
          {error && <p className="text-xs text-danger">No se pudo cargar el detalle del mensaje.</p>}
          {details && (
            <>
              <div>
                <p className="mb-0.5 text-xs uppercase tracking-wide text-muted">Enviado por</p>
                <SenderInfo details={details} clientName={clientName} />
              </div>
              <div>
                <p className="mb-0.5 text-xs uppercase tracking-wide text-muted">Fecha y hora</p>
                <p className="text-ink-soft">
                  {formatMessageDay(details.sentAt)} · {formatMessageTime(details.sentAt)}
                </p>
              </div>
              {details.fromMe && (
                <div>
                  <p className="mb-0.5 text-xs uppercase tracking-wide text-muted">Estado</p>
                  <p className={details.delivery === "error" ? "text-danger" : "text-ink-soft"}>
                    {details.delivery ? DELIVERY_LABEL[details.delivery] : "Sin dato"}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
