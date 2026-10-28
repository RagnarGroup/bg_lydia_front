"use client";

import { useEffect, useRef, useState } from "react";
import { ContactAvatar } from "@/components/ContactAvatar";
import { formatAudioTime, peaksFromSamples, placeholderPeaks, WAVEFORM_BARS } from "@/lib/waveform";

// LYD-132: reproductor de notas de voz al estilo WhatsApp (play/pausa, forma
// de onda clickeable, tiempo y velocidad) en vez del <audio controls> nativo.
// Toma el color del texto de la burbuja (currentColor), asi sirve igual en
// mensajes entrantes y salientes. La duracion va en la fila de la hora del
// mensaje (posicion absoluta respecto de la burbuja) y a la derecha va la foto
// del contacto, que se cambia por la velocidad mientras el audio esta en curso.

const SPEEDS = [1, 1.5, 2] as const;

let playingNow: HTMLAudioElement | null = null;

export interface VoiceNoteAvatar {
  seed: string;
  url?: string | null;
  // Fondo del circulo del microfono: el mismo color de la burbuja.
  badgeClass?: string;
}

export function VoiceNotePlayer({ src, seed, avatar }: { src: string; seed: string; avatar?: VoiceNoteAvatar }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [peaks, setPeaks] = useState(() => placeholderPeaks(seed));
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);

  useEffect(() => {
    let cancelled = false;
    const AudioCtx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    fetch(src)
      .then((res) => res.arrayBuffer())
      .then((buffer) => ctx.decodeAudioData(buffer))
      .then((decoded) => {
        if (cancelled) return;
        setPeaks(peaksFromSamples(decoded.getChannelData(0), WAVEFORM_BARS));
        setDuration((d) => (Number.isFinite(d) && d > 0 ? d : decoded.duration));
      })
      .catch(() => {})
      .finally(() => void ctx.close().catch(() => {}));
    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      if (audioRef.current) setCurrent(audioRef.current.currentTime);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio && playingNow === audio) playingNow = null;
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      if (playingNow && playingNow !== audio) playingNow.pause();
      playingNow = audio;
      audio.playbackRate = speed;
      void audio.play();
    } else {
      audio.pause();
    }
  };

  const seekTo = (fraction: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = Math.min(duration, Math.max(0, fraction * duration));
    setCurrent(audio.currentTime);
  };

  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const progress = duration ? Math.min(1, current / duration) : 0;
  const started = playing || current > 0;

  return (
    <div className="flex w-72 max-w-full items-center gap-2 px-1 pt-1">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
      />

      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pausar" : "Reproducir"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-current/10"
      >
        {playing ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <rect x="6" y="4.5" width="4" height="15" rx="1.2" />
            <rect x="14" y="4.5" width="4" height="15" rx="1.2" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.6-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z" />
          </svg>
        )}
      </button>

      <div
        role="slider"
        tabIndex={0}
        aria-label="Posición del audio"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(current)}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          seekTo((e.clientX - rect.left) / rect.width);
        }}
        onKeyDown={(e) => {
          if (!duration) return;
          if (e.key === "ArrowRight") seekTo((current + 5) / duration);
          if (e.key === "ArrowLeft") seekTo((current - 5) / duration);
        }}
        className="relative flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-[2px] focus:outline-none"
      >
        {peaks.map((peak, i) => (
          <span
            key={i}
            className={`w-[3px] flex-1 rounded-full transition-colors ${
              (i + 0.5) / peaks.length <= progress ? "bg-current" : "bg-current/35"
            }`}
            style={{ height: `${Math.round(peak * 100)}%` }}
          />
        ))}
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current shadow-sm"
          style={{ left: `${progress * 100}%` }}
        />
      </div>

      <div className="flex h-14 w-14 shrink-0 items-center justify-center">
        {started ? (
          <button
            type="button"
            onClick={cycleSpeed}
            aria-label={`Velocidad ${speed}x`}
            className="rounded-full bg-current/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums"
          >
            <span className="opacity-90">{speed}x</span>
          </button>
        ) : (
          <span className="relative">
            <ContactAvatar seed={avatar?.seed ?? seed} avatarUrl={avatar?.url} className="h-14 w-14" />
            <span
              className={`absolute -bottom-1 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full ${
                avatar?.badgeClass ?? ""
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-6a3.5 3.5 0 1 0-7 0v6A3.5 3.5 0 0 0 12 15Zm6.5-3.5a1 1 0 1 0-2 0 4.5 4.5 0 0 1-9 0 1 1 0 1 0-2 0 6.5 6.5 0 0 0 5.5 6.42V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.08a6.5 6.5 0 0 0 5.5-6.42Z" />
              </svg>
            </span>
          </span>
        )}
      </div>

      <span className="pointer-events-none absolute bottom-2 left-[3.4rem] text-[11px] leading-none tabular-nums opacity-75">
        {formatAudioTime(started ? current : duration)}
      </span>
    </div>
  );
}
