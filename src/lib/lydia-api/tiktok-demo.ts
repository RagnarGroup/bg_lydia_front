"use client";

/**
 * LYD-78: conversacion de TikTok de demostracion para grabar el video que
 * pide TikTok al solicitar el permiso Accounts API, mientras el canal real
 * no existe en lydia_bg_back. Solo aparece abriendo el inbox con
 * `?demo=tiktok` (queda activa en la pestaña hasta cerrarla): llega unos
 * segundos despues como mensaje nuevo, ya asignada a una asesora, y lo que
 * se responde queda en memoria del navegador. No tiene remoteJid, asi que
 * LeadDetailPanel la trata como solo lectura y nada de esto toca el backend.
 */
import { useEffect, useState } from "react";
import type { InboxConversation, InboxMessage } from "./inbox-types";

export const TIKTOK_DEMO_CONVERSATION_ID = "demo-tiktok-1";

const STORAGE_KEY = "lydia-demo";
const ARRIVAL_DELAY_MS = 4000;
const AGENT_NAME = "Mafer";
const FIRST_MESSAGE = "Hi! I saw your ad on TikTok. How much is the English course and when does the next group start?";

export function isTikTokDemoConversation(conversationId: string | null): boolean {
  return conversationId === TIKTOK_DEMO_CONVERSATION_ID;
}

function readDemoFlag(): boolean {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("demo");
    if (fromUrl === "tiktok") sessionStorage.setItem(STORAGE_KEY, "tiktok");
    if (fromUrl === "off") sessionStorage.removeItem(STORAGE_KEY);
    return sessionStorage.getItem(STORAGE_KEY) === "tiktok";
  } catch {
    return false;
  }
}

/** Momento en que "llego" el mensaje demo, o null si la demo esta apagada o todavia no llego. */
export function useTikTokDemoArrival(): string | null {
  const [arrivedAt, setArrivedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!readDemoFlag()) return;
    const timer = setTimeout(() => setArrivedAt(new Date().toISOString()), ARRIVAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return arrivedAt;
}

export function buildTikTokDemoConversation(arrivedAt: string, read: boolean): InboxConversation {
  return {
    id: TIKTOK_DEMO_CONVERSATION_ID,
    contact: {
      lydiaContactId: TIKTOK_DEMO_CONVERSATION_ID,
      name: "Valeria (TikTok)",
      email: null,
      phone: null,
      avatarUrl: "",
    },
    assignee: { id: "demo-agent", name: AGENT_NAME, avatarUrl: "" },
    status: "sin_respuesta",
    lastMessagePreview: FIRST_MESSAGE,
    lastMessageAt: arrivedAt,
    unreadCount: read ? 0 : 1,
    inboxChannel: "tiktok",
  };
}

export function getTikTokDemoMessages(arrivedAt: string): InboxMessage[] {
  return [
    {
      id: "demo-tiktok-msg-1",
      direction: "inbound",
      text: FIRST_MESSAGE,
      sentAt: arrivedAt,
      read: true,
      raw: { key: null, message: null },
      quotedPreview: null,
      reactions: [],
    },
  ];
}
