"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type { EvoTiktokChannel } from "@/lib/lydia-api/types";
import { LYDIA_API_ENABLED } from "@/lib/lydia-api/config";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`);
  return body as T;
}

// LYD-95: cuentas TikTok conectadas y su estado (conectada / requiere reautorizacion).
export function useTiktokChannels() {
  return useQuery({
    queryKey: ["tiktokChannels"],
    queryFn: () => fetchJson<{ channels: EvoTiktokChannel[] }>("/api/lydia/tiktok/channels"),
    select: (data) => data.channels,
    enabled: LYDIA_API_ENABLED,
    retry: false,
    staleTime: 60_000,
  });
}

// Pide la URL de autorizacion al back y manda al navegador a TikTok.
export function useConnectTiktok() {
  return useMutation({
    mutationFn: async () => {
      const { url } = await fetchJson<{ url: string }>("/api/lydia/tiktok/authorize-url");
      window.location.assign(url);
    },
  });
}
