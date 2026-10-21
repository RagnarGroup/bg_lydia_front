"use client";

import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { ChannelBadge } from "@/components/inbox/ChannelBadge";
import { formatLeadCardDate } from "@/lib/format";
import { useConnectTiktok, useTiktokChannels } from "@/lib/queries/tiktok";

const REASONS: Record<string, string> = {
  state_invalido: "El enlace de autorización venció o ya se usó. Intentá de nuevo.",
  acceso_denegado: "TikTok no concedió el acceso.",
  sin_codigo: "TikTok no devolvió el código de autorización.",
  error_interno: "No se pudo completar la conexión. Intentá de nuevo.",
};

// LYD-95: pantalla de canales -- conectar una cuenta de TikTok y ver si necesita reautorizacion. Solo
// administradores (el chequeo real esta en /api/lydia/tiktok/authorize-url).
export function CanalesPanel() {
  const { agent } = useAuth();
  const params = useSearchParams();
  const { data: channels = [], isLoading, error } = useTiktokChannels();
  const connect = useConnectTiktok();

  if (agent && agent.role !== "administrador") {
    return (
      <section className="flex h-full flex-1 items-center justify-center bg-bg px-8">
        <p className="text-sm text-muted">Esta sección es solo para administradores.</p>
      </section>
    );
  }

  const result = params.get("tiktok");
  const reason = params.get("reason");

  return (
    <section className="scroll-slim flex h-full flex-1 flex-col gap-6 overflow-y-auto bg-bg px-8 py-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ChannelBadge channel="tiktok" size={24} />
          <h1 className="text-lg font-semibold text-ink">TikTok</h1>
        </div>
        <button
          type="button"
          onClick={() => connect.mutate()}
          disabled={connect.isPending}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {connect.isPending
            ? "Redirigiendo…"
            : channels.length > 0
              ? "Conectar otra cuenta"
              : "Conectar cuenta de TikTok"}
        </button>
      </div>

      {result === "connected" && (
        <p className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-soft">
          Cuenta de TikTok conectada.
        </p>
      )}
      {result === "error" && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          No se pudo conectar la cuenta de TikTok. {reason ? (REASONS[reason] ?? "") : ""}
        </p>
      )}
      {connect.isError && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {connect.error.message}
        </p>
      )}

      {isLoading && <p className="text-sm text-muted">Cargando…</p>}
      {error && <p className="text-sm text-danger">No se pudo leer el estado de TikTok: {error.message}</p>}
      {!isLoading && !error && channels.length === 0 && (
        <p className="text-sm text-muted">Todavía no hay ninguna cuenta de TikTok conectada.</p>
      )}

      <ul className="flex flex-col gap-3">
        {channels.map((channel) => {
          const needsReauth = channel.status === "reauth_required";
          return (
            <li
              key={channel.businessId}
              className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {channel.displayName || channel.username || channel.businessId}
                </p>
                {channel.username && <p className="text-xs text-muted">@{channel.username}</p>}
                <p className="text-xs text-muted">
                  Acceso vigente hasta {formatLeadCardDate(channel.refreshTokenExpiresAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    needsReauth ? "bg-danger/10 text-danger" : "bg-brand/10 text-brand"
                  }`}
                >
                  {needsReauth ? "Requiere reautorización" : "Conectada"}
                </span>
                {needsReauth && (
                  <button
                    type="button"
                    onClick={() => connect.mutate()}
                    disabled={connect.isPending}
                    className="text-sm font-semibold text-brand underline hover:no-underline disabled:opacity-60"
                  >
                    Reautorizar
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
