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

export function showNewMessageNotification(title: string, body: string) {
  if (!isNotificationSupported() || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/icons/logo_simple.png", tag: "lydia-nuevo-mensaje" });
  } catch {
    // Notification puede tirar en navegadores/contextos raros (ej. iframes) --
    // el sonido ya se reprodujo, no vale la pena romper nada por esto.
  }
}
