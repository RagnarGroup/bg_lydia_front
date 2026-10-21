"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { LYDIA_API_ENABLED } from "@/lib/lydia-api/config";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { LANDING_SEDE_STORAGE_KEY } from "@/lib/landing/format";
import { CONSULTAS_FILTER, LANDING_SEDES, type VisitStatus } from "@/lib/landing/types";
import { useLandingLeads, useLandingSummary } from "@/lib/queries/landing-leads";
import { requestNotificationPermissionIfNeeded } from "@/lib/notifications";
import { LandingCalendar } from "./LandingCalendar";
import { LandingLeadDetail } from "./LandingLeadDetail";
import { LandingLeadList } from "./LandingLeadList";
import { LandingSidePanel } from "./LandingSidePanel";

type Tab = "leads" | "calendario";

const TABS: { id: Tab; label: string }[] = [
  { id: "leads", label: "Leads" },
  { id: "calendario", label: "Calendario" },
];

// Cada asesora atiende una sede: se recuerda la ultima que eligio. localStorage
// puede estar bloqueado (modo privado, politicas del navegador), por eso todo
// va en try/catch y nunca rompe la pantalla.
function readStoredSede(): string | null {
  try {
    const stored = window.localStorage.getItem(LANDING_SEDE_STORAGE_KEY);
    return stored && (LANDING_SEDES as readonly string[]).includes(stored) ? stored : null;
  } catch {
    return null;
  }
}

function storeSede(sede: string) {
  try {
    if (sede === "todas") window.localStorage.removeItem(LANDING_SEDE_STORAGE_KEY);
    else window.localStorage.setItem(LANDING_SEDE_STORAGE_KEY, sede);
  } catch {
    // sin persistencia: se sigue funcionando igual
  }
}

export function LandingView() {
  const [tab, setTab] = useState<Tab>("leads");
  // Filtro de sede compartido entre las pestanas Leads y Calendario.
  const [sede, setSede] = useState("todas");
  const [visitStatus, setVisitStatus] = useState<VisitStatus | "todos">("todos");
  const [unclaimedOnly, setUnclaimedOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // En mobile se alterna entre lista y detalle (mismo patron que el inbox de chat).
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  // Permiso para el aviso del navegador cuando entra un lead (mismo criterio que el inbox de chat).
  useEffect(() => {
    requestNotificationPermissionIfNeeded();
  }, []);

  // Se lee tras montar (no en el useState inicial) para no desajustar la hidratacion.
  useEffect(() => {
    const stored = readStoredSede();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leer localStorage solo es posible en el cliente, despues de hidratar
    if (stored) setSede(stored);
  }, []);

  const changeSede = (next: string) => {
    setSede(next);
    storeSede(next);
  };

  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const { data: summary } = useLandingSummary();
  const {
    data: leads = [],
    isLoading,
    error,
  } = useLandingLeads(
    {
      // LYD-100: "Consultas" no es una sede: filtra los leads sin visita.
      sede: sede === "todas" || sede === CONSULTAS_FILTER ? undefined : sede,
      tipo: sede === CONSULTAS_FILTER ? "consulta" : undefined,
      visitStatus: visitStatus === "todos" ? undefined : visitStatus,
      unclaimed: unclaimedOnly,
      search: debouncedSearch || undefined,
    },
    tab === "leads",
  );

  if (!LYDIA_API_ENABLED) {
    return (
      <EmptyState
        icon="landing"
        title="Landing"
        description="Acá llegan los leads del formulario de inscripciones de la web, pero la conexión al backend de Lydia está apagada. Activala con NEXT_PUBLIC_LYDIA_API_ENABLED=true para ver los leads reales."
      />
    );
  }

  const openLead = (id: string) => {
    setSelectedId(id);
    setMobileView("detail");
  };

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-bg text-ink">
      <div role="tablist" className="flex shrink-0 gap-1 border-b border-line bg-surface px-4 pt-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.id ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink-soft"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "calendario" ? (
        <LandingCalendar
          sede={sede}
          onSedeChange={changeSede}
          summary={summary}
          onOpenLead={(id) => {
            setTab("leads");
            openLead(id);
          }}
        />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className={`${mobileView === "list" ? "flex" : "hidden"} w-full shrink-0 md:flex md:w-auto`}>
            <LandingLeadList
              leads={leads}
              isLoading={isLoading}
              error={error}
              selectedId={selectedId}
              onSelect={openLead}
              sede={sede}
              onSedeChange={changeSede}
              summary={summary}
              visitStatus={visitStatus}
              onVisitStatusChange={setVisitStatus}
              unclaimedOnly={unclaimedOnly}
              onUnclaimedOnlyChange={setUnclaimedOnly}
              search={search}
              onSearchChange={setSearch}
            />
          </div>

          {selectedId ? (
            <>
              <div className={`${mobileView === "detail" ? "flex" : "hidden"} min-w-0 flex-1 md:flex`}>
                <LandingLeadDetail
                  key={selectedId}
                  leadId={selectedId}
                  onBack={() => setMobileView("list")}
                  footer={<LandingSidePanel leadId={selectedId} variant="stacked" />}
                />
              </div>
              <LandingSidePanel key={`side-${selectedId}`} leadId={selectedId} variant="aside" />
            </>
          ) : (
            <div className="hidden flex-1 items-center justify-center text-sm text-muted md:flex">
              {isLoading ? "Cargando leads…" : "Seleccioná un lead para ver el detalle."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
