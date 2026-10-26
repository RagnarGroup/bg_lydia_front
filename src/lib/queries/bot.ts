"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EvoBotGraph } from "@/lib/lydia-api/types";
import { LYDIA_API_ENABLED } from "@/lib/lydia-api/config";
import { fetchJson } from "./fetch-json";

interface BotFlowResponse {
  enabled: boolean;
  graph: EvoBotGraph;
  warnings: string[];
}

export function useBotFlow() {
  return useQuery({
    queryKey: ["botFlow"],
    queryFn: () => fetchJson<{ flow: BotFlowResponse }>(`/api/lydia/bot`),
    select: (data) => data.flow,
    enabled: LYDIA_API_ENABLED,
    retry: false,
    staleTime: 60_000,
  });
}

export function useUpdateBotFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { enabled?: boolean; graph?: EvoBotGraph }) =>
      fetchJson<{ flow: BotFlowResponse }>(`/api/lydia/bot`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["botFlow"] });
    },
  });
}
