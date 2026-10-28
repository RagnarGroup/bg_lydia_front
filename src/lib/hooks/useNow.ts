"use client";

import { useEffect, useState } from "react";

/**
 * LYD-118: hora actual que se refresca cada `intervalMs`, para lo que depende
 * del paso del tiempo y no de un cambio de datos (un chat pasa de amarillo a
 * rojo aunque el poll de conversaciones devuelva lo mismo).
 */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
