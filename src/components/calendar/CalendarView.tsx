"use client";

import { useMemo, useState } from "react";
import { agents, calendarEvents as mockCalendarEvents } from "@/lib/mock-data";
import { LYDIA_API_ENABLED } from "@/lib/lydia-api/config";
import { useCalendarEvents } from "@/lib/queries/calendar-events";
import { EventCard } from "./EventCard";
import { TaskQuickCreate, type QuickTask } from "./TaskQuickCreate";

const viewTabs = ["Día", "Semana", "Mes"] as const;
type ViewTab = (typeof viewTabs)[number];

function isSameDay(iso: string, reference: Date) {
  return new Date(iso).toDateString() === reference.toDateString();
}

const noteLabelByType: Record<QuickTask["type"], string> = {
  chat: "Mensaje",
  nota: "Nota",
  tarea: "Seguimiento",
  reserva: "Detalle",
};

export function CalendarView() {
  const [view, setView] = useState<ViewTab>("Día");
  const [tasks, setTasks] = useState<QuickTask[]>([]);

  const { data: realEvents = [], error: eventsError } = useCalendarEvents();
  const isMockMode = !LYDIA_API_ENABLED || eventsError !== null;
  const events = isMockMode ? mockCalendarEvents : realEvents;

  const now = useMemo(() => new Date(), []);
  const tomorrow = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d;
  }, [now]);

  const eventsToday = events.filter((e) => isSameDay(e.startAt, now));
  const eventsTomorrow = events.filter((e) => isSameDay(e.startAt, tomorrow));

  return (
    <section className="scroll-slim flex h-full flex-1 flex-col overflow-y-auto bg-bg px-8 py-6">
      <header className="flex flex-wrap items-center gap-4 border-b border-line pb-4">
        <div className="flex items-center gap-1 rounded-md border border-line bg-surface p-1 text-sm font-semibold text-muted">
          {viewTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setView(tab)}
              className={`rounded px-3 py-1 uppercase tracking-wide ${
                view === tab ? "bg-brand/10 text-brand" : "hover:text-ink-soft"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <span className="rounded-full bg-success/10 px-3 py-1 text-sm font-semibold text-success">Mis eventos</span>
        <button type="button" className="text-sm font-medium text-muted hover:text-ink-soft">
          + Nuevo filtro
        </button>
      </header>

      {view !== "Día" ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted">
          Vista de {view.toLowerCase()} — próximamente. Por ahora Lydia solo muestra la agenda del día.
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <div className="border-b border-line pb-2">
                <h2 className="text-center text-sm font-semibold tracking-wide text-ink-soft">EVENTOS DE HOY</h2>
                <p className="text-center text-xs text-muted">
                  {eventsToday.length} {eventsToday.length === 1 ? "evento" : "eventos"}
                </p>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {eventsToday.length === 0 && <p className="text-sm text-muted">Sin eventos para hoy.</p>}
                {eventsToday.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>

            <div>
              <div className="border-b border-line pb-2">
                <h2 className="text-center text-sm font-semibold tracking-wide text-ink-soft">EVENTOS DE MAÑANA</h2>
                <p className="text-center text-xs text-muted">
                  {eventsTomorrow.length} {eventsTomorrow.length === 1 ? "evento" : "eventos"}
                </p>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {eventsTomorrow.length === 0 && <p className="text-sm text-muted">Sin eventos para mañana.</p>}
                {eventsTomorrow.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Tareas</h2>
            <div className="mt-3 flex flex-col gap-2">
              {tasks.map((task) => {
                const agent = agents.find((a) => a.id === task.agentId);
                return (
                  <div key={task.id} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm">
                    <span className="font-semibold text-ink">
                      {task.type === "tarea"
                        ? "Tarea"
                        : task.type === "reserva"
                          ? "Reserva"
                          : task.type === "chat"
                            ? "Chat"
                            : "Nota"}
                    </span>{" "}
                    <span className="text-ink-soft">
                      para {task.day === "hoy" ? "hoy" : "mañana"} para {agent?.name ?? "—"}:{" "}
                    </span>
                    <span className="font-medium text-ink-soft">{noteLabelByType[task.type]}:</span>{" "}
                    <span className="text-ink-soft">{task.note}</span>
                  </div>
                );
              })}
              <TaskQuickCreate onCreate={(task) => setTasks((prev) => [...prev, task])} />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
