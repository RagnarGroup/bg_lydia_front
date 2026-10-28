"use client";

import { useChatParticipants } from "@/lib/queries/conversations";

interface Props {
  conversationId: string;
  canUseBackend: boolean;
}

function formatReportDate(reportDate: string): string {
  const [, month, day] = reportDate.split("-");
  return `${day}/${month}`;
}

// LYD-117: porcentaje de participacion de cada asesora segun su aporte real,
// lo asigna la auditoria diaria de las 21:00 (no cuenta mensajes). Una
// conversacion sin asesoras ese dia todavia no tiene calculo.
export function ChatParticipants({ conversationId, canUseBackend }: Props) {
  const { data: participants = [], isLoading, isError } = useChatParticipants(conversationId, canUseBackend);

  if (!canUseBackend) return null;

  return (
    <div className="mt-4 border-t border-line-soft pt-4">
      <label className="mb-1 block text-xs font-medium text-muted">Participación de asesoras</label>
      {isLoading ? (
        <p className="text-sm text-muted">Cargando...</p>
      ) : isError ? (
        <p className="text-sm text-muted">No se pudo cargar.</p>
      ) : participants.length === 0 ? (
        <p className="text-sm text-muted">Sin calcular todavía: se calcula cada día a las 21:00.</p>
      ) : (
        <>
          <ul className="space-y-1.5">
            {participants.map(({ agent, percent, reason }) => (
              <li key={agent.id} className="text-sm">
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-brand"
                    style={agent.color ? { backgroundColor: agent.color } : undefined}
                  />
                  <span className="min-w-0 truncate text-ink-soft">{agent.name}</span>
                  <span className="ml-auto font-medium text-ink">{percent}%</span>
                </div>
                {reason && <p className="pl-3.5 text-[11px] text-muted">{reason}</p>}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] text-muted">
            {participants[0].reportDate
              ? `Auditoría del ${formatReportDate(participants[0].reportDate)}, 21:00.`
              : "Lead tomado desde la landing."}
          </p>
        </>
      )}
    </div>
  );
}
