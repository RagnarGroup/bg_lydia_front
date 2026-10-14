"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { LandingSummary } from "@/lib/landing/types";
import { playPopSound, showNewMessageNotification } from "@/lib/notifications";

/**
 * LYD-84: sonido + notificacion cuando entra un lead nuevo de la landing, en
 * cualquier seccion de Lydia (el hook vive en NavRail, que esta siempre
 * montado). Compara el total por sede del resumen entre polls: si alguna sede
 * sube, llego un lead. Ademas invalida las queries de Landing para que la
 * lista se actualice en el mismo momento que el contador del menu.
 *
 * La primera lectura solo guarda el estado de partida, igual que
 * useNewMessageAlerts: no alerta por leads que ya estaban al abrir Lydia.
 */
export function useNewLandingLeadAlerts(summary: LandingSummary | undefined) {
  const queryClient = useQueryClient();
  const previousRef = useRef<Map<string, number> | null>(null);

  useEffect(() => {
    if (!summary) return;
    const current = new Map(Object.entries(summary.bySede).map(([sede, counts]) => [sede, counts.total]));
    const previous = previousRef.current;
    previousRef.current = current;
    if (!previous) return;

    const sedesWithNew = [...current]
      .filter(([sede, total]) => total > (previous.get(sede) ?? 0))
      .map(([sede]) => sede);
    if (sedesWithNew.length === 0) return;

    playPopSound();
    showNewMessageNotification(
      sedesWithNew.length === 1 ? `Nuevo lead · Sede ${sedesWithNew[0]}` : "Nuevos leads de la landing",
      `Llegó una solicitud de visita para ${sedesWithNew.join(", ")}.`,
    );
    void queryClient.invalidateQueries({ queryKey: ["landing"] });
  }, [summary, queryClient]);
}
