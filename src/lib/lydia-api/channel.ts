import type { InboxChannel } from "./inbox-types";

// LYD-31: metadata de presentacion por canal -- nombre para mostrar y color
// de marca. LYD-78: cada canal muestra su logo de public/icons (ver
// ChannelBadge); el color queda como respaldo si un canal no tiene logo.
export const CHANNEL_META: Record<InboxChannel, { label: string; color: string; icon?: string }> = {
  whatsapp: { label: "WhatsApp", color: "#25D366", icon: "/icons/ic_whatsapp.png" },
  messenger: { label: "Messenger", color: "#0084FF", icon: "/icons/ic_facebook.png" },
  instagram: { label: "Instagram", color: "#E1306C", icon: "/icons/ic_instagram.png" },
  tiktok: { label: "TikTok", color: "#000000", icon: "/icons/ic_tik_tok.png" },
};

export const CHANNEL_FILTERS: { id: InboxChannel | "todos"; label: string }[] = [
  { id: "todos", label: "Todos los canales" },
  { id: "whatsapp", label: CHANNEL_META.whatsapp.label },
  { id: "messenger", label: CHANNEL_META.messenger.label },
  { id: "instagram", label: CHANNEL_META.instagram.label },
  { id: "tiktok", label: CHANNEL_META.tiktok.label },
];
