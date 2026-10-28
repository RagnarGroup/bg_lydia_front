"use client";

import { useState } from "react";
import type { DeliveryStatus } from "@/lib/lydia-api/delivery-status";
import type { InboxMessage, InboxMessageMedia } from "@/lib/lydia-api/inbox-types";
import { formatMessageTime } from "@/lib/format";
import { useFetchMediaDataUrl } from "@/lib/queries/conversations";
import { MessageMedia } from "./MessageMedia";
import type { VoiceNoteAvatar } from "./VoiceNotePlayer";
import { MessageContextMenu } from "./MessageContextMenu";
import { ForwardMessageDialog } from "./ForwardMessageDialog";
import { MessageDetailsDialog } from "./MessageDetailsDialog";

interface Props {
  message: InboxMessage;
  instanceName: string;
  conversationId: string;
  onReply: (message: InboxMessage) => void;
  onReact: (message: InboxMessage, emoji: string) => void;
  onForward: (message: InboxMessage, targetConversationId: string) => void;
  // LYD-76: primer mensaje de una racha de la misma persona -- solo ahi va
  // el nombre de quien envio, como en los grupos de WhatsApp.
  isGroupStart?: boolean;
  // LYD-132: foto que muestra el reproductor de notas de voz.
  contactAvatar?: VoiceNoteAvatar;
}

// LYD-52: cuanto se aleja el menu del borde de la ventana para no salirse
// (se abre en las coordenadas del click, y ese click puede caer cerca del
// borde derecho/inferior del panel de chat).
const MENU_WIDTH = 220;
const MENU_HEIGHT = 300;

function copyableText(message: InboxMessage): string {
  if (message.text) return message.text;
  if (message.media) return `[archivo adjunto${message.media.fileName ? `: ${message.media.fileName}` : ""}]`;
  return "";
}

// LYD-64: extension para el nombre del archivo descargado cuando WhatsApp no
// manda fileName (fotos, videos, audios y stickers casi nunca lo traen).
const EXTENSION_BY_SUBTYPE: Record<string, string> = { jpeg: "jpg", quicktime: "mov", mpeg: "mp3", "svg+xml": "svg" };
const FALLBACK_NAME: Record<InboxMessageMedia["kind"], string> = {
  image: "imagen",
  sticker: "sticker",
  video: "video",
  audio: "audio",
  document: "documento",
};

function downloadFileName(media: InboxMessageMedia, sentAt: string): string {
  if (media.fileName) return media.fileName;
  const subtype = media.mimetype?.split(";")[0].trim().split("/")[1];
  const ext = subtype ? `.${EXTENSION_BY_SUBTYPE[subtype] ?? subtype}` : "";
  const stamp = sentAt.replace(/[^0-9]/g, "").slice(0, 14);
  return `${FALLBACK_NAME[media.kind]}-${stamp}${ext}`;
}

// Se pasa el data: URI a Blob antes de descargar: un <a download> con un
// data: URI de varios MB (videos, PDFs) falla en algunos navegadores.
async function triggerDownload(dataUrl: string, fileName: string) {
  const blob = await (await fetch(dataUrl)).blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// LYD-76: hora + estado de lectura dentro de la burbuja, como en WhatsApp.
// "inline" va al pie del texto; "overlay" va encima de una foto/video/sticker
// sin texto, sobre una pastilla oscura para que se lea sobre cualquier imagen.
const DELIVERY_LABEL: Record<DeliveryStatus, string> = {
  sent: "Enviado",
  delivered: "Entregado",
  read: "Leído",
};

function MessageMeta({
  sentAt,
  isOutbound,
  delivery,
  variant,
  showChecks = isOutbound,
  className = "",
}: {
  sentAt: string;
  isOutbound: boolean;
  delivery: DeliveryStatus;
  variant: "inline" | "overlay";
  showChecks?: boolean;
  className?: string;
}) {
  const tone =
    variant === "overlay"
      ? "rounded-full bg-black/45 px-1.5 py-0.5 text-white"
      : isOutbound
        ? "text-white/75"
        : "text-muted";
  const read = delivery === "read";
  const checkTone = read ? (variant === "overlay" || isOutbound ? "text-sky-200" : "text-brand") : "";
  return (
    <span className={`flex items-center gap-0.5 whitespace-nowrap text-[11px] leading-none ${tone} ${className}`}>
      {formatMessageTime(sentAt)}
      {showChecks && (
        <svg
          width="18"
          height="12"
          viewBox="0 0 18 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`ml-0.5 shrink-0 ${checkTone}`}
          aria-label={DELIVERY_LABEL[delivery]}
        >
          {delivery !== "sent" ? (
            <>
              <polyline points="1.5 6.5 4.5 9.5 11 2.5" />
              <polyline points="8 8 9.5 9.5 16 2.5" />
            </>
          ) : (
            <polyline points="4 6.5 7 9.5 13.5 2.5" />
          )}
        </svg>
      )}
    </span>
  );
}

export function MessageBubble({
  message,
  instanceName,
  conversationId,
  onReply,
  onReact,
  onForward,
  isGroupStart = true,
  contactAvatar,
}: Props) {
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [showForward, setShowForward] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const fetchMediaDataUrl = useFetchMediaDataUrl();

  if (message.direction === "system") {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-full bg-bg-subtle px-3 py-1 text-xs text-ink-soft">{message.text}</span>
      </div>
    );
  }

  const isOutbound = message.direction === "outbound";
  const myReaction = message.reactions.find((r) => r.fromMe)?.emoji ?? null;

  const media = message.media;
  const handleDownload = media
    ? async () => {
        const dataUrl = await fetchMediaDataUrl(message.id, media.raw, instanceName);
        await triggerDownload(dataUrl, downloadFileName(media, message.sentAt));
      }
    : undefined;

  // LYD-76: donde va la hora. Foto/video/sticker sin texto: encima de la
  // imagen. Audio/documento sin texto: en una fila propia al pie. Texto (o
  // pie de foto): al final de la ultima linea, con un espaciador invisible
  // que le reserva el lugar para que el texto no quede debajo de la hora.
  const isSticker = media?.kind === "sticker";
  // LYD-132: nota de voz sin texto: debajo del final de la forma de onda, al
  // nivel de la duracion y pegada al borde inferior. En las del cliente
  // tambien lleva el doble check (entregado) a la derecha de la hora, como
  // las ve el cliente en su WhatsApp.
  const metaPlacement: "inline" | "overlay" | "row" | "audio" =
    media && !media.caption
      ? media.kind === "image" || media.kind === "video" || media.kind === "sticker"
        ? "overlay"
        : media.kind === "audio"
          ? "audio"
          : "row"
      : "inline";
  const metaSpacer = <span aria-hidden className={`inline-block ${isOutbound ? "w-[4.25rem]" : "w-11"}`} />;
  // Los stickers van sin burbuja, igual que en WhatsApp. Esquinas casi
  // rectas como alla; solo el primero de cada racha lleva la esquina en
  // punta y la colita hacia quien escribe (derecha la asesora, izquierda
  // el cliente).
  const bubbleClass = isSticker
    ? "relative"
    : `relative rounded-lg text-sm leading-relaxed ${
        media ? "overflow-hidden p-1.5" : "whitespace-pre-line px-3 py-1.5"
      } ${isOutbound ? "bg-brand text-white" : "bg-surface text-ink shadow-sm"} ${
        isGroupStart ? (isOutbound ? "rounded-tr-none" : "rounded-tl-none") : ""
      }`;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const x = Math.min(e.clientX, window.innerWidth - MENU_WIDTH - 8);
    const y = Math.min(e.clientY, window.innerHeight - MENU_HEIGHT - 8);
    setMenuPos({ x, y });
  };

  return (
    <div className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
      <div className="flex max-w-md flex-col gap-0.5">
        {isOutbound && isGroupStart && message.senderName && (
          <span className="self-end text-xs text-muted">{message.senderName}</span>
        )}
        <div className={`relative ${message.reactions.length > 0 ? "pb-2" : ""}`} onContextMenu={handleContextMenu}>
          {isGroupStart && !isSticker && (
            <svg
              aria-hidden
              width="8"
              height="13"
              viewBox="0 0 8 13"
              className={`absolute -top-px ${isOutbound ? "-right-2 text-brand" : "-left-2 text-surface"}`}
            >
              <path
                fill="currentColor"
                d={
                  isOutbound
                    ? "M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"
                    : "M1.533 3.568L8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z"
                }
              />
            </svg>
          )}
          <div className={bubbleClass}>
            {message.quotedPreview && (
              <p
                className={`mb-1.5 truncate rounded-md border-l-2 px-2 py-1 text-xs italic ${
                  isOutbound ? "border-white/60 bg-white/10 text-white/80" : "border-brand/60 bg-black/5 text-ink-soft"
                } ${message.media ? "mx-1.5 mt-1.5" : "-mx-0.5"}`}
              >
                {message.quotedPreview}
              </p>
            )}
            {message.media && (
              <MessageMedia
                messageId={message.id}
                media={message.media}
                instanceName={instanceName}
                avatar={
                  contactAvatar && {
                    ...contactAvatar,
                    badgeClass: isOutbound ? "bg-brand" : "bg-surface",
                    side: isOutbound ? "right" : "left",
                  }
                }
              />
            )}
            {message.media?.caption && (
              <p className="whitespace-pre-line px-2 pb-0.5 pt-1.5">
                {message.media.caption}
                {metaSpacer}
              </p>
            )}
            {!message.media && (
              <>
                {message.text}
                {metaSpacer}
              </>
            )}
            {metaPlacement === "overlay" ? (
              <MessageMeta
                sentAt={message.sentAt}
                isOutbound={isOutbound}
                delivery={message.delivery}
                variant="overlay"
                className={`absolute ${isSticker ? "bottom-1 right-1" : "bottom-3 right-3"}`}
              />
            ) : metaPlacement === "audio" ? (
              <MessageMeta
                sentAt={message.sentAt}
                isOutbound={isOutbound}
                delivery={isOutbound ? message.delivery : "delivered"}
                variant="inline"
                showChecks
                className={`absolute bottom-2 ${isOutbound ? "right-[4.625rem]" : "right-2.5"}`}
              />
            ) : metaPlacement === "row" ? (
              <div className="flex justify-end px-1.5 pb-0.5 pt-1">
                <MessageMeta
                  sentAt={message.sentAt}
                  isOutbound={isOutbound}
                  delivery={message.delivery}
                  variant="inline"
                />
              </div>
            ) : (
              <MessageMeta
                sentAt={message.sentAt}
                isOutbound={isOutbound}
                delivery={message.delivery}
                variant="inline"
                className={`absolute ${message.media ? "bottom-2 right-3.5" : "bottom-1.5 right-2.5"}`}
              />
            )}
          </div>

          {message.reactions.length > 0 && (
            <div className={`absolute -bottom-1 flex gap-0.5 ${isOutbound ? "right-2" : "left-2"}`}>
              {message.reactions.map((r) => (
                <span
                  key={`${r.emoji}-${r.fromMe}`}
                  className="flex h-5 min-w-5 items-center justify-center rounded-full border border-line-soft bg-surface px-1 text-xs shadow-sm"
                >
                  {r.emoji}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {menuPos && (
        <MessageContextMenu
          x={menuPos.x}
          y={menuPos.y}
          copyText={copyableText(message)}
          activeEmoji={myReaction}
          onReply={() => onReply(message)}
          onReact={(emoji) => onReact(message, emoji)}
          onForward={() => setShowForward(true)}
          onDownload={handleDownload}
          onDetails={() => setShowDetails(true)}
          onClose={() => setMenuPos(null)}
        />
      )}

      {showDetails && (
        <MessageDetailsDialog
          messageId={message.id}
          clientName={isOutbound ? undefined : message.senderName}
          onClose={() => setShowDetails(false)}
        />
      )}

      {showForward && (
        <ForwardMessageDialog
          excludeConversationId={conversationId}
          onPick={(targetId) => {
            onForward(message, targetId);
            setShowForward(false);
          }}
          onClose={() => setShowForward(false)}
        />
      )}
    </div>
  );
}
