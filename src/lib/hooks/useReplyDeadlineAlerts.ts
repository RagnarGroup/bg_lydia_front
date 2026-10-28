"use client";

import { useEffect, useRef } from "react";
import type { InboxConversation } from "@/lib/lydia-api/inbox-types";
import {
  alertKey,
  formatWaiting,
  isMyAlert,
  minutesWaiting,
  replyUrgency,
  type ReplyUrgency,
} from "@/lib/reply-deadline";
import { dropAnsweredReplyAlerts, pushReplyAlert } from "@/lib/reply-alerts-store";
import { playReplyOverdueSound, playReplyWarningSound, showNewMessageNotification } from "@/lib/notifications";
import { useNow } from "./useNow";

interface PendingReply {
  conversation: InboxConversation;
  urgency: ReplyUrgency;
  minutes: number;
  key: string;
}

/**
 * LYD-118: detecta los chats que cruzan los 5 min (amarillo) y los 10 min
 * (rojo) sin respuesta y dispara el aviso en pantalla + sonido, una vez por
 * chat y nivel. Solo para los chats donde escribio la asesora logueada o
 * donde no escribio ninguna (isMyAlert). Si la pestana no esta a la vista, tambien manda la
 * notificacion del sistema.
 *
 * Al abrir Lydia no se dispara un aviso por cada chat que ya estaba atrasado:
 * sale un solo aviso resumen (mismo criterio que useNewMessageAlerts, que no
 * alerta por lo que ya estaba al entrar).
 */
export function useReplyDeadlineAlerts(
  conversations: InboxConversation[] | undefined,
  myAgentId: string | null,
  enabled: boolean,
) {
  const nowMs = useNow(5_000);
  const notifiedRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!enabled || !conversations || !myAgentId) return;

    const pending: PendingReply[] = [];
    for (const conversation of conversations) {
      if (conversation.status === "cerrado" || !conversation.awaitingReplySince) continue;
      if (!isMyAlert(conversation.participantIds, myAgentId)) continue;
      const urgency = replyUrgency(conversation.awaitingReplySince, nowMs);
      const minutes = minutesWaiting(conversation.awaitingReplySince, nowMs);
      if (!urgency || minutes === null) continue;
      pending.push({
        conversation,
        urgency,
        minutes,
        key: alertKey(conversation.id, conversation.awaitingReplySince, urgency),
      });
    }

    dropAnsweredReplyAlerts(new Set(pending.map((p) => p.conversation.id)));

    const notified = notifiedRef.current;
    if (notified === null) {
      notifiedRef.current = new Set(pending.map((p) => p.key));
      if (pending.length > 0) announceSummary(pending);
      return;
    }

    const fresh = pending.filter((p) => !notified.has(p.key));
    if (fresh.length === 0) return;

    for (const p of fresh) {
      notified.add(p.key);
      pushReplyAlert({
        id: p.key,
        conversationId: p.conversation.id,
        urgency: p.urgency,
        title: p.conversation.contact.name,
        body: p.conversation.lastMessagePreview || "Mensaje sin texto",
        waitingLabel: `Sin respuesta hace ${formatWaiting(p.minutes)}`,
        avatarSeed: p.conversation.contact.lydiaContactId,
        avatarUrl: p.conversation.contact.avatarUrl,
      });
    }

    const worst = fresh.find((p) => p.urgency === "overdue") ?? fresh[0];
    playUrgencySound(worst.urgency);
    if (document.visibilityState !== "visible") {
      showNewMessageNotification(
        fresh.length === 1
          ? `${worst.conversation.contact.name}: sin respuesta`
          : `${fresh.length} chats sin respuesta`,
        `Lleva ${formatWaiting(worst.minutes)} esperando respuesta.`,
        "lydia-sin-respuesta",
      );
    }
  }, [conversations, nowMs, myAgentId, enabled]);
}

function playUrgencySound(urgency: ReplyUrgency) {
  if (urgency === "overdue") playReplyOverdueSound();
  else playReplyWarningSound();
}

function announceSummary(pending: PendingReply[]) {
  const overdue = pending.filter((p) => p.urgency === "overdue").length;
  const longest = Math.max(...pending.map((p) => p.minutes));
  const urgency: ReplyUrgency = overdue > 0 ? "overdue" : "warning";
  const total = pending.length;

  pushReplyAlert({
    id: `resumen|${Date.now()}`,
    conversationId: null,
    urgency,
    title: total === 1 ? "1 chat sin respuesta" : `${total} chats sin respuesta`,
    body:
      overdue > 0
        ? `${overdue === total ? (total === 1 ? "Lleva" : "Todos llevan") : `${overdue} llevan`} más de 10 min esperando.`
        : "Llevan más de 5 min esperando.",
    waitingLabel: `El más antiguo: ${formatWaiting(longest)}`,
  });
  playUrgencySound(urgency);
}
