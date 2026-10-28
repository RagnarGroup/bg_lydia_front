/**
 * LYD-57: alerta de mensaje nuevo -- sonido + notificacion del navegador.
 *
 * El sonido se sintetiza con Web Audio API (dos tonos cortos, uno agudo
 * seguido de uno grave con caida rapida) en vez de reproducir un archivo de
 * audio: no hay forma de buscar/descargar un asset real de sonido desde este
 * entorno. Si en algun momento se consigue un audio real de "burbuja
 * reventando", reemplazar playPopSound() por un <audio> o AudioBufferSourceNode
 * cargando ese archivo -- el resto de este modulo (permiso, notificacion) no
 * cambia.
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) audioContext = new AudioContextClass();
  return audioContext;
}

// Un "pop" de dos golpes cortos con caida rapida de volumen y de tono --
// apunta a algo parecido a una burbuja reventando, sin depender de un asset.
export function playPopSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === "suspended") void ctx.resume();

    const now = ctx.currentTime;
    const pop = (start: number, freqFrom: number, freqTo: number, peakGain: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freqFrom, now + start);
      osc.frequency.exponentialRampToValueAtTime(freqTo, now + start + duration);
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(peakGain, now + start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + duration + 0.02);
    };

    pop(0, 1100, 500, 0.25, 0.09);
    pop(0.08, 700, 300, 0.18, 0.11);
  } catch {
    // Web Audio bloqueado (autoplay policy sin interaccion previa, etc) --
    // no romper el resto de la app por esto.
  }
}

// LYD-118: tono simple con ataque y caida cortos, base de los sonidos de
// "lead sin respuesta" -- distintos del pop de mensaje nuevo para que la
// asesora sepa que es una alerta sin mirar la pantalla.
function playTones(tones: { start: number; freq: number; duration: number; gain: number; type?: OscillatorType }[]) {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    for (const tone of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tone.type ?? "sine";
      osc.frequency.setValueAtTime(tone.freq, now + tone.start);
      gain.gain.setValueAtTime(0.0001, now + tone.start);
      gain.gain.exponentialRampToValueAtTime(tone.gain, now + tone.start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.start + tone.duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + tone.start);
      osc.stop(now + tone.start + tone.duration + 0.02);
    }
  } catch {
    // Igual que playPopSound: si el navegador bloquea el audio, la alerta visual sigue.
  }
}

// 5 min (amarillo): campanita de dos notas ascendentes.
export function playReplyWarningSound() {
  playTones([
    { start: 0, freq: 880, duration: 0.35, gain: 0.22 },
    { start: 0.18, freq: 1320, duration: 0.5, gain: 0.18 },
  ]);
}

// 10 min (rojo): tres pitidos insistentes, repetidos dos veces.
export function playReplyOverdueSound() {
  const beeps = [0, 0.16, 0.32, 0.7, 0.86, 1.02].map((start) => ({
    start,
    freq: 988,
    duration: 0.12,
    gain: 0.2,
    type: "square" as OscillatorType,
  }));
  playTones(beeps);
}

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

// Solo pide el permiso si todavia no se pidio -- si el usuario ya lo denego
// no hay que insistir cada vez que se abre el inbox.
export function requestNotificationPermissionIfNeeded() {
  if (!isNotificationSupported()) return;
  if (Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}

// LYD-118: `tag` agrupa notificaciones del mismo tipo (una nueva reemplaza a
// la anterior con el mismo tag en vez de apilarse).
export function showNewMessageNotification(title: string, body: string, tag = "lydia-nuevo-mensaje") {
  if (!isNotificationSupported() || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/icons/logo_simple.png", tag });
  } catch {
    // Notification puede tirar en navegadores/contextos raros (ej. iframes) --
    // el sonido ya se reprodujo, no vale la pena romper nada por esto.
  }
}
