// LYD-132: forma de onda de una nota de voz. `peaksFromSamples` reduce las
// muestras PCM a `bars` alturas entre 0 y 1 (pico por tramo, normalizado al
// mayor); `placeholderPeaks` da barras estables mientras el audio se decodifica
// o si el navegador no puede decodificarlo.
export const WAVEFORM_BARS = 40;
const MIN_HEIGHT = 0.12;

export function peaksFromSamples(samples: ArrayLike<number>, bars = WAVEFORM_BARS): number[] {
  if (!samples.length) return placeholderPeaks("", bars);
  const size = Math.max(1, Math.floor(samples.length / bars));
  const peaks: number[] = [];
  for (let bar = 0; bar < bars; bar++) {
    let peak = 0;
    const end = Math.min(samples.length, (bar + 1) * size);
    for (let i = bar * size; i < end; i++) {
      const value = Math.abs(samples[i]);
      if (value > peak) peak = value;
    }
    peaks.push(peak);
  }
  const max = Math.max(...peaks);
  return peaks.map((p) => (max > 0 ? Math.max(MIN_HEIGHT, p / max) : MIN_HEIGHT));
}

export function placeholderPeaks(seed: string, bars = WAVEFORM_BARS): number[] {
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return Array.from({ length: bars }, (_, i) => {
    hash = Math.imul(hash ^ (i + 1), 16777619);
    return 0.25 + ((hash >>> 0) % 1000) / 1000 / 2;
  });
}

export function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}
