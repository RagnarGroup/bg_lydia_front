"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AgentKnowledgeCategory, EvoAgentInstructions, EvoAgentKnowledge } from "@/lib/lydia-api/types";
import { LYDIA_API_ENABLED } from "@/lib/lydia-api/config";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  return body as T;
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export interface AgentKnowledgeInput {
  title: string;
  category: AgentKnowledgeCategory;
  content: string;
  active?: boolean;
}

// LYD-69: seccion "Agente" de Automatizaciones (solo administrador).

export function useAgentKnowledge() {
  return useQuery({
    queryKey: ["agentKnowledge"],
    queryFn: () => fetchJson<{ knowledge: EvoAgentKnowledge[] }>(`/api/lydia/agent/knowledge`),
    select: (data) => data.knowledge,
    enabled: LYDIA_API_ENABLED,
    retry: false,
  });
}

export function useCreateAgentKnowledge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AgentKnowledgeInput) => fetchJson(`/api/lydia/agent/knowledge`, jsonInit("POST", data)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agentKnowledge"] }),
  });
}

export function useUpdateAgentKnowledge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<AgentKnowledgeInput> & { id: string }) =>
      fetchJson(`/api/lydia/agent/knowledge/${id}`, jsonInit("PATCH", data)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agentKnowledge"] }),
  });
}

export function useDeleteAgentKnowledge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson<void>(`/api/lydia/agent/knowledge/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agentKnowledge"] }),
  });
}

export function useAgentInstructions() {
  return useQuery({
    queryKey: ["agentInstructions"],
    queryFn: () => fetchJson<EvoAgentInstructions>(`/api/lydia/agent/instructions`),
    enabled: LYDIA_API_ENABLED,
    retry: false,
  });
}

export function useSetAgentInstructions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (instructions: string) =>
      fetchJson<EvoAgentInstructions>(`/api/lydia/agent/instructions`, jsonInit("PUT", { instructions })),
    onSuccess: (data) => queryClient.setQueryData(["agentInstructions"], data),
  });
}

export function useTestAgent() {
  return useMutation({
    mutationFn: (message: string) =>
      fetchJson<{ suggestion: string }>(`/api/lydia/agent/test`, jsonInit("POST", { message })),
  });
}
