"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";

// LYD-52: mismos 6 emojis default de la reaccion rapida de WhatsApp.
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

interface Props {
  x: number;
  y: number;
  copyText: string;
  // LYD-52: emoji con el que ya reaccione a este mensaje, si hay uno -- se
  // marca en la fila y volver a tocarlo saca la reaccion (toggle).
  activeEmoji: string | null;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onForward: () => void;
  // LYD-64: solo viene cuando el mensaje trae adjunto (foto, video, audio,
  // documento) -- sin eso no se muestra la opcion.
  onDownload?: () => Promise<void>;
  // LYD-105: abre el modal con quien envio el mensaje.
  onDetails: () => void;
  onClose: () => void;
}

// LYD-52: menu propio al hacer click derecho sobre un mensaje -- reemplaza
// puntualmente el menu nativo del navegador solo ahi (ver el onContextMenu
// que ChatThread.tsx sacaba de todo el panel). Posicionado en las coordenadas
// del click, mismo patron de outside-click + Escape que ConversationRowMenu.
export function MessageContextMenu({
  x,
  y,
  copyText,
  activeEmoji,
  onReact,
  onReply,
  onForward,
  onDownload,
  onDetails,
  onClose,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [downloadState, setDownloadState] = useState<"idle" | "loading" | "error">("idle");
  const ref = useRef<HTMLDivElement>(null);

  useEscapeKey(true, onClose);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(onClose, 600);
    } catch {
      onClose();
    }
  };

  const handleDownload = async () => {
    if (!onDownload) return;
    setDownloadState("loading");
    try {
      await onDownload();
      onClose();
    } catch {
      setDownloadState("error");
    }
  };

  return (
    <div
      ref={ref}
      role="menu"
      style={{ left: x, top: y }}
      className="fixed z-30 w-52 rounded-lg border border-line bg-surface p-1.5 shadow-lg"
    >
      <div className="flex items-center justify-between gap-1 px-1 pb-1.5">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => {
              // Tocar de nuevo la reaccion ya activa la saca (mismo criterio
              // que el long-press de WhatsApp).
              onReact(emoji === activeEmoji ? "" : emoji);
              onClose();
            }}
            aria-label={`Reaccionar con ${emoji}`}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-lg hover:bg-bg-subtle ${
              emoji === activeEmoji ? "bg-brand/15 ring-2 ring-brand" : ""
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
      <div className="my-1 border-t border-line-soft" />
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onReply();
          onClose();
        }}
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-ink-soft hover:bg-bg-subtle"
      >
        <Icon name="responder" size={15} />
        Responder
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onForward();
          onClose();
        }}
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-ink-soft hover:bg-bg-subtle"
      >
        <Icon name="reenviar" size={15} />
        Reenviar
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={handleCopy}
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-ink-soft hover:bg-bg-subtle"
      >
        <Icon name="copiar" size={15} />
        {copied ? "Copiado" : "Copiar"}
      </button>
      {onDownload && (
        <button
          type="button"
          role="menuitem"
          onClick={handleDownload}
          disabled={downloadState === "loading"}
          className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-bg-subtle disabled:cursor-wait ${
            downloadState === "error" ? "text-danger" : "text-ink-soft"
          }`}
        >
          <Icon name="descargar" size={15} />
          {downloadState === "loading"
            ? "Descargando…"
            : downloadState === "error"
              ? "No se pudo descargar"
              : "Descargar"}
        </button>
      )}
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onDetails();
          onClose();
        }}
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-ink-soft hover:bg-bg-subtle"
      >
        <Icon name="persona" size={15} />
        Ver detalles
      </button>
    </div>
  );
}
