"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InboxNote } from "@/lib/lydia-api/inbox-types";
import { LYDIA_API_ENABLED } from "@/lib/lydia-api/config";
import { useAuth } from "@/components/providers/AuthProvider";
import { fetchJson } from "./fetch-json";

// LYD-21: el backend ya tenia listNotes/addNote (CRM-12), sin ningun
// componente que las consumiera.
export function useNotes(conversationId: string | null) {
  return useQuery({
    queryKey: ["notes", conversationId],
    queryFn: () => fetchJson<{ notes: InboxNote[] }>(`/api/lydia/conversations/${conversationId}/notes`),
    select: (data) => data.notes,
    enabled: LYDIA_API_ENABLED && conversationId !== null,
    retry: false,
  });
}

export function useAddNote(conversationId: string | null) {
  const queryClient = useQueryClient();
  const { agent } = useAuth();

  return useMutation({
    mutationFn: (content: string) =>
      fetchJson<{ note: InboxNote }>(`/api/lydia/conversations/${conversationId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, agentId: agent?.id }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", conversationId] });
    },
  });
}
