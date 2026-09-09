import type { MelodyNote } from "@/data/music/types";

/**
 * Calcule le décalage (demi-tons) pour que les notes tiennent dans [low, high].
 * Si elles tiennent déjà, décalage 0 ; sinon on centre dans la zone.
 */
export function fitShift(notes: Array<MelodyNote | number>, low: number, high: number): number {
  const midis = notes.map((n) => (typeof n === "number" ? n : n.midi)).filter((m): m is number => m !== null);
  if (midis.length === 0) return 0;
  const min = Math.min(...midis);
  const max = Math.max(...midis);
  if (min >= low && max <= high) return 0;
  const center = (low + high) / 2;
  const melodyCenter = (min + max) / 2;
  let shift = Math.round(center - melodyCenter);
  // Ne pas dépasser les bornes si la mélodie est plus étroite que la zone
  if (max + shift > high) shift = high - max;
  if (min + shift < low) shift = low - min;
  return shift;
}

/** Mélodie exprimée en temps → secondes. */
export function melodyToTimeline(notes: MelodyNote[], bpm: number, shift = 0): Array<{ midi: number | null; start: number; duration: number; lyric?: string; breath?: boolean }> {
  const beat = 60 / bpm;
  let t = 0;
  return notes.map((n) => {
    const item = { midi: n.midi === null ? null : n.midi + shift, start: t, duration: n.beats * beat, lyric: n.lyric, breath: n.breath };
    t += n.beats * beat;
    return item;
  });
}

export function melodyDuration(notes: MelodyNote[], bpm: number): number {
  return notes.reduce((a, n) => a + n.beats, 0) * (60 / bpm);
}
