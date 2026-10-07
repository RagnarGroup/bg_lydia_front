"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";
import { templateGroups as mockTemplateGroups } from "@/lib/mock-data";
import { LYDIA_API_ENABLED } from "@/lib/lydia-api/config";
import { useTemplateGroups } from "@/lib/queries/template-groups";
import type { InboxMessage } from "@/lib/lydia-api/inbox-types";
import { Icon } from "@/components/icons";
import { useSuggestReply } from "@/lib/queries/conversations";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";

// LYD-52: {key, message} crudo del mensaje citado -- lo que Evolution API
// espera como `quoted` en sendText/sendMedia.
export type ComposerQuoted = { key: unknown; message: unknown };

export interface ComposerMediaInput {
  mediatype: "image" | "document" | "video" | "audio";
  media: string;
  mimetype?: string;
  fileName?: string;
  quoted?: ComposerQuoted;
}

function replyPreviewText(message: InboxMessage): string {
  if (message.text) return message.text;
  if (message.media) return `[archivo adjunto${message.media.fileName ? `: ${message.media.fileName}` : ""}]`;
  return "";
}

export interface ComposerAudioInput {
  audio: string;
  quoted?: ComposerQuoted;
}

interface Props {
  // LYD-68: conversacion sobre la que se pide la sugerencia de respuesta con IA.
  conversationId?: string;
  onSend: (text: string, quoted?: ComposerQuoted) => Promise<void>;
  onSendMedia: (input: ComposerMediaInput) => Promise<void>;
  onSendAudio: (input: ComposerAudioInput) => Promise<void>;
  disabled?: boolean;
  // LYD-52: mensaje al que se esta respondiendo (elegido con "Responder" del
  // menu contextual), null cuando el envio es normal.
  replyingTo?: InboxMessage | null;
  onCancelReply?: () => void;
}

function mediatypeFromMime(mimetype: string): ComposerMediaInput["mediatype"] {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  if (mimetype.startsWith("audio/")) return "audio";
  return "document";
}

// LYD-53: File extends Blob -- sirve igual para el adjunto elegido a mano
// que para el Blob que arma MediaRecorder al grabar una nota de voz.
function readBlobAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(blob);
  });
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function Composer({
  conversationId,
  onSend,
  onSendMedia,
  onSendAudio,
  disabled = false,
  replyingTo = null,
  onCancelReply,
}: Props) {
  const [value, setValue] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // LYD-68: sugerencia de respuesta con IA. Solo copia el texto al textarea
  // para que la asesora lo revise y lo envie ella -- nunca manda nada solo.
  const suggestReply = useSuggestReply();
  const handleSuggest = () => {
    if (!conversationId) return;
    suggestReply.mutate(conversationId, {
      onSuccess: ({ suggestion }) => {
        setValue(suggestion);
        setHighlighted(0);
        setError(null);
        requestAnimationFrame(() => {
          const textarea = textareaRef.current;
          textarea?.focus();
          textarea?.setSelectionRange(suggestion.length, suggestion.length);
        });
      },
    });
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  // LYD-55: picker de emojis para insertar en el texto (distinto de las
  // reacciones rapidas del menu contextual, LYD-52 -- esto es edicion local
  // del textarea, no manda nada a la API).
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiWrapperRef = useRef<HTMLDivElement>(null);
  useEscapeKey(showEmojiPicker, () => setShowEmojiPicker(false));
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiWrapperRef.current && !emojiWrapperRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  const insertEmoji = (data: EmojiClickData) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + data.emoji + value.slice(end);
    setValue(next);
    setShowEmojiPicker(false);
    // Reponer el cursor justo despues del emoji insertado -- sin esto queda
    // al final del textarea (comportamiento por defecto de setValue).
    requestAnimationFrame(() => {
      const pos = start + data.emoji.length;
      textarea?.focus();
      textarea?.setSelectionRange(pos, pos);
    });
  };

  // LYD-53: grabacion de nota de voz -- estado separado del resto porque
  // reemplaza toda la fila de botones mientras esta activa.
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopRecordingStream = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    mediaRecorderRef.current = null;
  };

  // Si el composer se desmonta con el mic todavia abierto (se cambia de
  // conversacion a mitad de una grabacion), no debe quedar el microfono
  // encendido en segundo plano. Solo toca refs (estables) para no arrastrar
  // stopRecordingStream a las deps del efecto.
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const startRecording = async () => {
    if (disabled || isSending || isRecording) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      setError("No se pudo acceder al micrófono");
    }
  };

  const cancelRecording = () => {
    mediaRecorderRef.current?.stop();
    stopRecordingStream();
    setIsRecording(false);
  };

  const stopAndSendRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    recorder.onstop = async () => {
      const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType });
      stopRecordingStream();
      setIsRecording(false);
      setIsSending(true);
      try {
        const audio = await readBlobAsBase64(blob);
        await onSendAudio({ audio, quoted: replyingTo ? replyingTo.raw : undefined });
        onCancelReply?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo enviar la nota de voz");
      } finally {
        setIsSending(false);
      }
    };
    recorder.stop();
  };

  const { data: realGroups = [], error: groupsError } = useTemplateGroups();
  const isMockMode = !LYDIA_API_ENABLED || groupsError !== null;
  const templateGroups = isMockMode ? mockTemplateGroups : realGroups;
  const allTemplates = useMemo(() => templateGroups.flatMap((group) => group.templates), [templateGroups]);

  const isSlashMode = value.startsWith("/");
  const query = isSlashMode ? value.slice(1).toLowerCase() : "";
  const filtered = useMemo(
    () =>
      isSlashMode
        ? allTemplates.filter(
            (t) => t.label.toLowerCase().includes(query) || t.command.toLowerCase().includes(query),
          )
        : [],
    [isSlashMode, query, allTemplates],
  );

  const handleSend = async () => {
    const text = value.trim();
    if (!text || disabled || isSending) return;
    setError(null);
    setIsSending(true);
    try {
      await onSend(text, replyingTo ? replyingTo.raw : undefined);
      setValue("");
      onCancelReply?.();
    } catch (e) {
      // LYD-14: antes esto borraba el texto igual y el mensaje se perdia en
      // silencio si el POST fallaba -- ahora se mantiene en el composer y
      // se puede reintentar con el mismo texto.
      setError(e instanceof Error ? e.message : "No se pudo enviar el mensaje");
    } finally {
      setIsSending(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite elegir el mismo archivo dos veces seguidas
    if (!file || disabled || isSending) return;

    setError(null);
    setIsSending(true);
    try {
      const media = await readBlobAsBase64(file);
      await onSendMedia({
        mediatype: mediatypeFromMime(file.type),
        media,
        mimetype: file.type || "application/octet-stream",
        fileName: file.name,
        quoted: replyingTo ? replyingTo.raw : undefined,
      });
      onCancelReply?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el archivo");
    } finally {
      setIsSending(false);
    }
  };

  const selectTemplate = (template: (typeof allTemplates)[number]) => {
    setValue(template.body);
    setHighlighted(0);
    textareaRef.current?.focus();
  };

  return (
    <div className="border-t border-line-soft p-3">
      {error && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          <span>No se pudo enviar: {error}</span>
          {value.trim() && (
            <button type="button" onClick={handleSend} className="shrink-0 font-semibold underline hover:no-underline">
              Reintentar
            </button>
          )}
        </div>
      )}
      {suggestReply.isError && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          <span>No se pudo generar la sugerencia: {suggestReply.error.message}</span>
          <button
            type="button"
            onClick={() => suggestReply.reset()}
            aria-label="Cerrar aviso"
            className="shrink-0 hover:opacity-70"
          >
            <Icon name="equis" size={14} />
          </button>
        </div>
      )}
      <div className="relative rounded-2xl border border-line bg-surface">
        {replyingTo && (
          <div className="flex items-center justify-between gap-2 rounded-t-2xl border-b border-line-soft bg-bg-subtle px-3 py-1.5">
            <p className="min-w-0 truncate border-l-2 border-brand pl-2 text-xs italic text-ink-soft">
              {replyPreviewText(replyingTo)}
            </p>
            <button
              type="button"
              onClick={onCancelReply}
              aria-label="Cancelar respuesta"
              className="shrink-0 text-muted hover:text-ink-soft"
            >
              <Icon name="equis" size={14} />
            </button>
          </div>
        )}
        {isSlashMode && (
          <div className="scroll-slim absolute bottom-full left-0 z-10 mb-2 max-h-64 w-full overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-lg">
            {filtered.length === 0 && <p className="px-3 py-2 text-sm text-muted">Sin plantillas para &quot;{query}&quot;</p>}
            {filtered.map((template, i) => (
              <button
                key={template.command}
                type="button"
                onClick={() => selectTemplate(template)}
                onMouseEnter={() => setHighlighted(i)}
                className={`block w-full px-3 py-2 text-left ${i === highlighted ? "bg-brand/10" : "hover:bg-bg-subtle"}`}
              >
                <p className="text-sm font-semibold text-brand">{template.command}</p>
                <p className="truncate text-xs text-ink-soft">{template.body}</p>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end">
          <div className="min-w-0 flex-1">
            <textarea
              ref={textareaRef}
              value={value}
              disabled={disabled}
              spellCheck
              lang="es"
              onChange={(e) => {
                setValue(e.target.value);
                setHighlighted(0);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (isSlashMode && filtered.length > 0) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setHighlighted((i) => Math.min(i + 1, filtered.length - 1));
                    return;
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHighlighted((i) => Math.max(i - 1, 0));
                    return;
                  }
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    selectTemplate(filtered[highlighted]);
                    return;
                  }
                }
                if (e.key === "Escape" && isSlashMode) {
                  e.preventDefault();
                  setValue("");
                  return;
                }
                if (e.key === "Enter" && !e.shiftKey && !isSlashMode) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={2}
              placeholder="Escribe un mensaje o */* para mensajes predeterminados"
              className="w-full resize-none rounded-tl-2xl px-4 pt-3 text-sm text-ink-soft placeholder:text-muted focus:outline-none"
            />
            {isRecording ? (
              <div className="flex items-center justify-between px-3 pb-2.5">
                <div className="flex items-center gap-2 text-sm text-ink-soft">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-danger" />
                  Grabando… {formatElapsed(recordingSeconds)}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cancelRecording}
                    aria-label="Descartar grabación"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-bg-subtle hover:text-danger"
                  >
                    <Icon name="basura" size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={stopAndSendRecording}
                    aria-label="Enviar nota de voz"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-dark"
                  >
                    <Icon name="check" size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center px-3 pb-2.5">
                <div className="flex items-center gap-3 text-muted">
                  <div ref={emojiWrapperRef} className="relative">
                    <button
                      type="button"
                      aria-label="Emoji"
                      disabled={disabled || isSending}
                      onClick={() => setShowEmojiPicker((v) => !v)}
                      className="hover:text-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                        <line x1="9" y1="9" x2="9.01" y2="9" />
                        <line x1="15" y1="9" x2="15.01" y2="9" />
                      </svg>
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-full left-0 z-20 mb-2">
                        <EmojiPicker
                          onEmojiClick={insertEmoji}
                          autoFocusSearch={false}
                          width={320}
                          height={380}
                          searchPlaceholder="Buscar emoji"
                        />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label="Adjuntar archivo"
                    disabled={disabled || isSending}
                    onClick={() => fileInputRef.current?.click()}
                    className="hover:text-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3.5 3.5 0 014.95 4.95l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                    </svg>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                    className="hidden"
                  />
                  <button
                    type="button"
                    aria-label="Nota de voz"
                    disabled={disabled || isSending}
                    onClick={startRecording}
                    className="hover:text-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                      <path d="M19 10v2a7 7 0 01-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
          {!isRecording && (
            <div className="flex shrink-0 flex-col items-end gap-2 pb-2.5 pr-3">
              <button
                type="button"
                onClick={handleSuggest}
                disabled={!conversationId || disabled || isSending || suggestReply.isPending}
                aria-label="Sugerir respuesta con IA"
                title="Sugerir respuesta con IA"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-bg-subtle hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon name="foco" size={18} className={suggestReply.isPending ? "animate-pulse text-brand" : undefined} />
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={!value.trim() || disabled || isSending}
                className="rounded-lg bg-muted-2 px-4 py-1.5 text-sm font-medium text-white transition-colors enabled:bg-brand enabled:hover:bg-brand-dark disabled:cursor-not-allowed"
              >
                {/* LYD-54: "disabled" ahora tambien cubre el bloqueo por ventana
                    de 24h -- "Enviando…" seria enganioso ahi, isSending es lo
                    unico que de verdad significa "en vuelo". */}
                {isSending ? "Enviando…" : "Enviar"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
