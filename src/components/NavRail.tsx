"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useConversations } from "@/lib/queries/conversations";
import { Icon, type IconName } from "./icons";
import packageJson from "../../package.json";

// Version del propio Lydia (front), no confundir con la de lydia_bg_back
// (fork de Evolution API, versionado aparte segun el upstream). Se lee de
// package.json para tener una sola fuente de verdad -- bump manual en cada
// release hasta que haya un proceso de versionado automatico.
const APP_VERSION = packageJson.version;

type NavLeaf = { type: "leaf"; label: string; href: string; icon: IconName };
type NavSection = {
  type: "section";
  id: string;
  label: string;
  icon: IconName;
  // LYD-69: adminOnly esconde la entrada a las asesoras (el gateo real vive en
  // los route handlers del servidor, esto es solo UX).
  items: { label: string; href: string; icon: IconName; adminOnly?: boolean }[];
  // LYD-43: seccion siempre desplegada, sin chevron ni forma de colapsarla.
  alwaysOpen?: boolean;
};
type NavEntry = NavLeaf | NavSection;

const topEntries: NavEntry[] = [
  { type: "leaf", label: "Inicio", href: "/inicio", icon: "inicio" },
  {
    type: "section",
    id: "comunicaciones",
    label: "Comunicaciones",
    icon: "chat",
    alwaysOpen: true,
    items: [
      { label: "Inbox de chat", href: "/comunicaciones/inbox-chat", icon: "chat" },
      { label: "Inbox de correo", href: "/comunicaciones/inbox-correo", icon: "correo" },
      { label: "Chats de equipo", href: "/comunicaciones/chats-equipo", icon: "equipo" },
    ],
  },
  {
    type: "section",
    id: "pipelines",
    label: "Pipelines",
    icon: "embudo",
    items: [
      { label: "Embudo de chats", href: "/pipelines/embudo-chats", icon: "embudo" },
      { label: "Todos los leads", href: "/pipelines/todos-los-leads", icon: "tabla" },
    ],
  },
];

const bottomEntries: NavEntry[] = [
  { type: "leaf", label: "Calendario", href: "/calendario", icon: "calendario" },
  {
    type: "section",
    id: "automatizaciones",
    label: "Automatizaciones",
    icon: "rayo",
    items: [
      { label: "Plantillas", href: "/automatizaciones/plantillas", icon: "tabla" },
      { label: "Bot", href: "/automatizaciones/bot", icon: "chat" },
      { label: "Agente", href: "/automatizaciones/agente", icon: "foco", adminOnly: true },
    ],
  },
  {
    type: "section",
    id: "insights",
    label: "Insights",
    icon: "grafico",
    items: [
      { label: "Panel de control personal", href: "/insights/panel-personal", icon: "grafico" },
      { label: "Reporte de consolidados", href: "/insights/reporte-consolidados", icon: "tabla" },
      { label: "Registro de actividades", href: "/insights/registro-actividades", icon: "bandeja" },
    ],
  },
];

function CollapsedItem({
  href,
  label,
  icon,
  active,
  badge,
  onClick,
}: {
  href: string;
  label: string;
  icon: IconName;
  active: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  // Barra azul (LYD-34): estado activo colapsado se invierte a fondo blanco +
  // texto de marca, igual que en sga_brittany_front -- mismo criterio que el
  // expandido, solo que aca no hay lugar para el texto, solo el icono.
  const className = `mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-md ${
    active ? "bg-white text-brand" : "text-white/70 hover:bg-white/10 hover:text-white"
  }`;

  if (onClick) {
    return (
      <button type="button" title={label} onClick={onClick} className={`${className} relative`}>
        <Icon name={icon} />
        {badge ? <UnreadBadge count={badge} className="absolute -right-1 -top-1" /> : null}
      </button>
    );
  }
  return (
    <Link href={href} title={label} className={className}>
      <Icon name={icon} />
    </Link>
  );
}

// LYD-43: globo de mensajes no leidos del sidebar.
function UnreadBadge({ count, className = "" }: { count: number; className?: string }) {
  return (
    <span
      className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-white ${className}`}
    >
      {count > 999 ? "999+" : count}
    </span>
  );
}

export function NavRail() {
  const pathname = usePathname();
  const { agent, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [manualToggle, setManualToggle] = useState<Record<string, boolean>>({});

  // LYD-43: total de no leidos -- misma query que el inbox (se pollea cada
  // 15s, no agrega requests aparte cuando el inbox esta abierto).
  const { data: conversations } = useConversations();
  const unreadTotal = (conversations ?? []).reduce((sum, c) => sum + c.unreadCount, 0);
  const badgeFor = (section: NavSection) => (section.id === "comunicaciones" ? unreadTotal : 0);

  const isSectionOpen = (section: NavSection) => {
    if (section.alwaysOpen) return true;
    if (section.id in manualToggle) return manualToggle[section.id];
    return section.items.some((item) => pathname.startsWith(item.href));
  };

  const toggleSection = (section: NavSection) => {
    setManualToggle((prev) => ({ ...prev, [section.id]: !isSectionOpen(section) }));
  };

  const renderEntry = (entry: NavEntry) => {
    if (entry.type === "leaf") {
      if (collapsed) {
        return <CollapsedItem key={entry.href} {...entry} active={pathname.startsWith(entry.href)} />;
      }
      return (
        <Link
          key={entry.href}
          href={entry.href}
          className={`mb-1 flex items-center gap-3 rounded-md px-3 py-2 font-semibold ${
            pathname.startsWith(entry.href)
              ? "bg-white/15 text-white"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Icon name={entry.icon} />
          {entry.label}
        </Link>
      );
    }

    const open = isSectionOpen(entry);

    if (collapsed) {
      return (
        <CollapsedItem
          key={entry.id}
          href="#"
          label={entry.label}
          icon={entry.icon}
          active={entry.items.some((item) => pathname.startsWith(item.href))}
          badge={badgeFor(entry)}
          onClick={() => setCollapsed(false)}
        />
      );
    }

    return (
      <div key={entry.id} className="mt-2">
        {entry.alwaysOpen ? (
          <div className="flex w-full items-center justify-between px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/60">
            <span>{entry.label}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => toggleSection(entry)}
            className={
              open
                ? "flex w-full items-center justify-between px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/60 hover:text-white"
                : "mb-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-left font-semibold text-white/70 hover:bg-white/10 hover:text-white"
            }
          >
            <span className="flex items-center gap-3">
              {!open && <Icon name={entry.icon} />}
              {entry.label}
            </span>
            <Icon
              name="chevronDown"
              size={14}
              strokeWidth={2}
              className={`shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
            />
          </button>
        )}

        {open &&
          entry.items
            .filter((item) => !item.adminOnly || agent?.role === "administrador")
            .map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mb-1 flex items-center gap-3 rounded-md px-3 py-2 ${
                    active ? "bg-white/15 font-semibold text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon name={item.icon} size={17} />
                  {item.label}
                  {item.href === "/comunicaciones/inbox-chat" && unreadTotal > 0 && (
                    <UnreadBadge count={unreadTotal} className="ml-auto" />
                  )}
                </Link>
              );
            })}
      </div>
    );
  };

  return (
    <aside className={`flex h-full flex-col bg-brand ${collapsed ? "w-16" : "w-60"} shrink-0 transition-[width]`}>
      <div className={`relative flex items-center justify-center py-5 ${collapsed ? "px-0" : "px-4"}`}>
        <div className={collapsed ? "hidden" : "flex items-center"}>
          <Image src="/icons/logo_blanco.png" alt="Brittany Group" width={124} height={32} />
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white ${
            collapsed ? "" : "absolute right-4 top-1/2 -translate-y-1/2"
          }`}
          aria-label="Colapsar navegación"
        >
          {collapsed ? (
            <Image src="/icons/logo_simple.png" alt="" width={22} height={22} className="rounded-md" />
          ) : (
            <Icon name="panel" size={17} />
          )}
        </button>
      </div>

      <nav className="scroll-slim flex-1 overflow-y-auto px-3 pb-4 text-sm">
        {topEntries.map(renderEntry)}
        <div className="mt-2 border-t border-white/10 pt-2">{bottomEntries.map(renderEntry)}</div>
      </nav>

      {!collapsed && <p className="pb-1 text-center text-[10px] text-white/40">v{APP_VERSION}</p>}

      {agent && (
        <div className={`border-t border-white/10 p-3 ${collapsed ? "flex justify-center" : ""}`}>
          {collapsed ? (
            <button
              type="button"
              title={`${agent.name} — Cerrar sesión`}
              onClick={() => signOut()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white hover:bg-white/25"
            >
              {agent.name.charAt(0).toUpperCase()}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white">
                {agent.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{agent.name}</p>
                <p className="truncate text-xs text-white/60">{agent.email}</p>
              </div>
              <button
                type="button"
                title="Cerrar sesión"
                onClick={() => signOut()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
              >
                <Icon name="salir" size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
