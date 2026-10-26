"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Lead, PipelineStageId } from "@/lib/types";
import { LYDIA_API_ENABLED } from "@/lib/lydia-api/config";
import { fetchJson } from "./fetch-json";

export function useLeads(params: { stage?: PipelineStageId; assignedAgentId?: string; chatId?: string } = {}) {
  const query = new URLSearchParams();
  if (params.stage) query.set("stage", params.stage);
  if (params.assignedAgentId) query.set("assignedAgentId", params.assignedAgentId);
  if (params.chatId) query.set("chatId", params.chatId);

  return useQuery({
    queryKey: ["leads", params.stage ?? "all", params.assignedAgentId ?? "all", params.chatId ?? "all"],
    queryFn: () => fetchJson<{ leads: Lead[] }>(`/api/lydia/leads?${query.toString()}`),
    select: (data) => data.leads,
    enabled: LYDIA_API_ENABLED,
    retry: false,
    refetchInterval: 30_000,
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) =>
      fetchJson<{ lead: Lead }>(`/api/lydia/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Lead> & { contactName: string; source: string }) =>
      fetchJson<{ lead: Lead }>(`/api/lydia/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}
