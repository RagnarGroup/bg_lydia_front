import type { LandingAgentRef, VisitStatus } from "@/lib/landing/types";
import { sedeStyle, VISIT_STATUS_META } from "@/lib/landing/format";

// LYD-84: piezas visuales compartidas por lista, detalle y calendario.

// La sede es lo primero que mira cada asesora: chip con borde y color propio.
export function SedeChip({ sede, size = "md" }: { sede: string; size?: "md" | "lg" }) {
  const style = sedeStyle(sede);
  const sizing = size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border font-bold uppercase tracking-wide ${sizing} ${style.chip}`}
    >
      <span className={`h-2 w-2 rounded-full ${style.dot}`} />
      {sede}
    </span>
  );
}

export function VisitStatusBadge({ status }: { status: VisitStatus }) {
  const meta = VISIT_STATUS_META[status];
  return (
    <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta?.badge ?? ""}`}>
      {meta?.label ?? status}
    </span>
  );
}

// El color de la asesora puede venir como hex/rgb (estilo inline) o como clase bg-*.
export function AgentDot({ agent, size = 24 }: { agent: LandingAgentRef; size?: number }) {
  const color = agent.color?.trim();
  const isCssColor = !!color && /^(#|rgb|hsl)/i.test(color);
  const className = !isCssColor && color?.startsWith("bg-") ? color : !isCssColor ? "bg-brand" : "";
  return (
    <span
      title={agent.name}
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.45),
        ...(isCssColor ? { backgroundColor: color } : {}),
      }}
    >
      {agent.name.charAt(0).toUpperCase()}
    </span>
  );
}

export function NewBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
      Nuevo
    </span>
  );
}

// LYD-87: etiqueta de campana (ej. AUPAIR_USA).
export function TagChip({ tag }: { tag: string }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
      {tag}
    </span>
  );
}
