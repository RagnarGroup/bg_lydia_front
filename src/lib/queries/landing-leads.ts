"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LYDIA_API_ENABLED } from "@/lib/lydia-api/config";
import type { LeadStage } from "@/lib/lydia-api/types";
import type {
  LandingLead,
  LandingLeadDetail,
  LandingLeadFilters,
  LandingSummary,
  LandingVisitInput,
} from "@/lib/landing/types";
import { LydiaFetchError } from "./conversations";

// LYD-84: leads del formulario web. El agentId nunca viaja desde aca: los
// route handlers lo toman de la sesion.

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new LydiaFetchError(res.status, body.error ?? `Error ${res.status}`);
  }
  return body as T;
}

function post<T>(url: string, body?: unknown): Promise<T> {
  return fetchJson<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

function toQueryString(filters: LandingLeadFilters): string {
  const query = new URLSearchParams();
  if (filters.sede) query.set("sede", filters.sede);
  if (filters.visitStatus) query.set("visitStatus", filters.visitStatus);
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  if (filters.unclaimed) query.set("unclaimed", "true");
  if (filters.search) query.set("search", filters.search);
  return query.toString();
}

export function useLandingLeads(filters: LandingLeadFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ["landing", "list", filters],
    queryFn: () => fetchJson<{ leads: LandingLead[] }>(`/api/lydia/landing-leads?${toQueryString(filters)}`),
    select: (data) => data.leads,
    enabled: LYDIA_API_ENABLED && enabled,
    retry: false,
    refetchInterval: 15_000,
  });
}

export function useLandingSummary() {
  return useQuery({
    queryKey: ["landing", "summary"],
    queryFn: () => fetchJson<{ summary: LandingSummary }>(`/api/lydia/landing-leads/summary`),
    select: (data) => data.summary,
    enabled: LYDIA_API_ENABLED,
    retry: false,
    // Alimenta la alerta de lead nuevo (useNewLandingLeadAlerts): sigue
    // consultando aunque la pestana este en segundo plano.
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
  });
}

export function useLandingLead(id: string | null) {
  return useQuery({
    queryKey: ["landing", "detail", id],
    queryFn: () => fetchJson<{ lead: LandingLeadDetail }>(`/api/lydia/landing-leads/${id}`),
    select: (data) => data.lead,
    enabled: LYDIA_API_ENABLED && id !== null,
    retry: false,
    refetchInterval: 20_000,
  });
}

// Toda mutacion refresca lista, detalle y contador del menu.
function useLandingMutation<TVars>(mutationFn: (vars: TVars) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["landing"] }),
  });
}

export function useClaimLandingLead() {
  return useLandingMutation((id: string) => post(`/api/lydia/landing-leads/${id}/claim`));
}

export function useReleaseLandingLead() {
  return useLandingMutation((id: string) => post(`/api/lydia/landing-leads/${id}/release`));
}

export function useSetLandingVisit() {
  return useLandingMutation(({ id, ...input }: { id: string } & LandingVisitInput) =>
    post(`/api/lydia/landing-leads/${id}/visit`, input),
  );
}

export function useAddLandingNote() {
  return useLandingMutation(({ id, content }: { id: string; content: string }) =>
    post(`/api/lydia/landing-leads/${id}/notes`, { content }),
  );
}

export function useSetLandingStage() {
  return useLandingMutation(({ id, stage }: { id: string; stage: LeadStage }) =>
    post(`/api/lydia/landing-leads/${id}/stage`, { stage }),
  );
}
