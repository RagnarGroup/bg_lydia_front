"use client";

import { useState } from "react";
import type { InboxMessageMedia } from "@/lib/lydia-api/inbox-types";
import { useResolveMedia } from "@/lib/queries/conversations";
import { Icon } from "@/components/icons";

interface Props {
  messageId: string;
  media: InboxMessageMedia;
  instanceName: string;
}

// LYD-15: imagen/sticker/audio/video se resuelven solos al pintar el bubble
// (como en WhatsApp Web); documento pide un click antes de gastar el
// decrypt-on-demand de Evolution API (puede pesar bastante y no siempre se
// necesita ver).
const AUTO_LOAD_KINDS: InboxMessageMedia["kind"][] = ["image", "sticker", "audio", "video"];

const MEDIA_LABEL: Partial<Record<InboxMessageMedia["kind"], string>> = {
  image: "la imagen",
  sticker: "el sticker",
  audio: "el audio",
  video: "el video",
  document: "el documento",
};

export function MessageMedia({ messageId, media, instanceName }: Props) {
  const [manualLoad, setManualLoad] = useState(false);
  const enabled = AUTO_LOAD_KINDS.includes(media.kind) || manualLoad;
  const { data: dataUrl, isLoading, isFetching, error, refetch } = useResolveMedia(
    messageId,
    media.raw,
    instanceName,
    enabled,
  );

  // LYD-110: con "Reintentar" -- muchas veces es un fallo pasajero al bajar la
  // media de Meta, y antes la unica salida era recargar toda la pagina.
  if (error) {
    return (
      <p className="flex items-center gap-2 text-xs italic text-danger">
        No se pudo cargar {MEDIA_LABEL[media.kind] ?? "el archivo"}
        {media.fileName ? `: ${media.fileName}` : ""}.
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="not-italic font-semibold underline hover:no-underline disabled:opacity-50"
        >
          {isFetching ? "Cargando..." : "Reintentar"}
        </button>
      </p>
    );
  }

  if (media.kind === "document") {
    if (dataUrl) {
      return (
        <a
          href={dataUrl}
          download={media.fileName ?? "documento"}
          className="flex items-center gap-2 rounded-lg border border-line-soft bg-surface px-3 py-2 text-xs font-medium text-brand hover:bg-bg-subtle"
        >
          <Icon name="clip" size={14} />
          {media.fileName ?? "Descargar documento"}
        </a>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setManualLoad(true)}
        disabled={isLoading}
        className="flex items-center gap-2 rounded-lg border border-line-soft bg-surface px-3 py-2 text-xs font-medium text-ink-soft hover:bg-bg-subtle disabled:cursor-wait"
      >
        <Icon name="clip" size={14} />
        {isLoading ? "Descargando…" : `Descargar${media.fileName ? ` ${media.fileName}` : ""}`}
      </button>
    );
  }

  if (isLoading || !dataUrl) {
    return (
      <div
        className={`animate-pulse rounded-lg bg-bg-subtle ${media.kind === "sticker" ? "h-36 w-36" : "h-40 w-56"}`}
      />
    );
  }

  // LYD-76: los stickers (stickerMessage de WhatsApp) van a su tamano, sin
  // estirarse como una foto.
  if (media.kind === "sticker") {
    // eslint-disable-next-line @next/next/no-img-element -- data: URI, no aplica el optimizador de Next
    return <img src={dataUrl} alt="sticker" className="h-36 w-36 object-contain" />;
  }

  if (media.kind === "image") {
    // eslint-disable-next-line @next/next/no-img-element -- data: URI, no aplica el optimizador de Next
    return <img src={dataUrl} alt={media.caption ?? "imagen adjunta"} className="max-w-xs rounded-lg" />;
  }

  if (media.kind === "video") {
    return <video src={dataUrl} controls className="max-w-xs rounded-lg" />;
  }

  return <audio src={dataUrl} controls className="max-w-xs" />;
}
