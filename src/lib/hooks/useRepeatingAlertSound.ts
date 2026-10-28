"use client";

import { useEffect } from "react";
import type { ReplyUrgency } from "@/lib/reply-deadline";
import { playReplyOverdueSound, playReplyWarningSound } from "@/lib/notifications";

// Cada cuanto se repite el sonido mientras el aviso siga en pantalla. El
// primero ya lo toca useReplyDeadlineAlerts al aparecer el aviso.
const REPEAT_MS: Record<ReplyUrgency, number> = {
  warning: 4_000,
  overdue: 5_000,
};

/**
 * LYD-118: mientras haya un aviso de "sin respuesta" visible, sigue sonando
 * para que la asesora no lo pase por alto. Suena el del aviso mas urgente; se
 * corta al cerrarlo o al responder el chat (el aviso desaparece y `urgency`
 * pasa a null).
 */
export function useRepeatingAlertSound(urgency: ReplyUrgency | null) {
  useEffect(() => {
    if (!urgency) return;
    const play = urgency === "overdue" ? playReplyOverdueSound : playReplyWarningSound;
    const id = setInterval(play, REPEAT_MS[urgency]);
    return () => clearInterval(id);
  }, [urgency]);
}
