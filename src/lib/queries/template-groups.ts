"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TemplateGroup } from "@/lib/types";
import { LYDIA_API_ENABLED } from "@/lib/lydia-api/config";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  return body as T;
}

export function useTemplateGroups() {
  return useQuery({
    queryKey: ["templateGroups"],
    queryFn: () => fetchJson<{ groups: TemplateGroup[] }>(`/api/lydia/template-groups`),
    select: (data) => data.groups,
    enabled: LYDIA_API_ENABLED,
    retry: false,
    staleTime: 60_000,
  });
}

// LYD-10: usadas por la pantalla admin de plantillas (PlantillasTable /
// NewTemplateModal) -- Composer.tsx solo lee, no crea.

export function useCreateTemplateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (title: string) =>
      fetchJson<{ group: { id: string; title: string } }>(`/api/lydia/template-groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templateGroups"] });
    },
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      command,
      label,
      body,
    }: {
      groupId: string;
      command: string;
      label: string;
      body: string;
    }) =>
      fetchJson<{ template: { id: string; command: string; label: string; body: string } }>(
        `/api/lydia/template-groups/${groupId}/templates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command, label, body }),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templateGroups"] });
    },
  });
}

// LYD-46: editar una plantilla existente (PATCH del route handler que ya
// existia, y del endpoint /crm/templates/:id del back).
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, command, label, body }: { id: string; command: string; label: string; body: string }) =>
      fetchJson<{ template: { id: string; command: string; label: string; body: string } }>(
        `/api/lydia/templates/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command, label, body }),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templateGroups"] });
    },
  });
}
