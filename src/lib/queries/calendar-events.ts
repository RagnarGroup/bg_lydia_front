"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CalendarEvent } from "@/lib/types";
import { LYDIA_API_ENABLED } from "@/lib/lydia-api/config";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  return body as T;
}

export function useCalendarEvents(params: { agentId?: string; from?: string; to?: string } = {}) {
  const query = new URLSearchParams();
  if (params.agentId) query.set("agentId", params.agentId);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);

  return useQuery({
    queryKey: ["calendarEvents", params.agentId ?? "all", params.from ?? "", params.to ?? ""],
    queryFn: () => fetchJson<{ events: CalendarEvent[] }>(`/api/lydia/calendar-events?${query.toString()}`),
    select: (data) => data.events,
    enabled: LYDIA_API_ENABLED,
    retry: false,
    refetchInterval: 30_000,
  });
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      type: CalendarEvent["type"];
      leadId?: string;
      agentId?: string;
      startAt: string;
      endAt: string;
      note: string;
    }) =>
      fetchJson<{ event: CalendarEvent }>(`/api/lydia/calendar-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CalendarEvent> }) =>
      fetchJson<{ event: CalendarEvent }>(`/api/lydia/calendar-events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}
