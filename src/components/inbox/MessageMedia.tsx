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

export function MessageMedia({ messageId, media, instanceName }: Props) {
  const [manualLoad, setManualLoad] = useState(false);
  const enabled = AUTO_LOAD_KINDS.includes(media.kind) || manualLoad;
  const { data: dataUrl, isLoading, error } = useResolveMedia(messageId, media.raw, instanceName, enabled);

  if (error) {
    return (
      <p className="text-xs italic text-danger">
        No se pudo cargar el archivo{media.fileName ? `: ${media.fileName}` : ""}.
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
    return <div className="h-40 w-56 animate-pulse rounded-lg bg-bg-subtle" />;
  }

  if (media.kind === "image" || media.kind === "sticker") {
    // eslint-disable-next-line @next/next/no-img-element -- data: URI, no aplica el optimizador de Next
    return <img src={dataUrl} alt={media.caption ?? "imagen adjunta"} className="max-w-xs rounded-lg" />;
  }

  if (media.kind === "video") {
    return <video src={dataUrl} controls className="max-w-xs rounded-lg" />;
  }

  return <audio src={dataUrl} controls className="max-w-xs" />;
}
