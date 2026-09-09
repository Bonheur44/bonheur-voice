/** Utilitaires notes / MIDI / fréquences. La = 440 Hz, MIDI 69. */

export const NOTE_NAMES_FR = ["Do", "Do#", "Ré", "Ré#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
export const NOTE_NAMES_EN = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

/** Nom français avec octave scientifique (Do3 = C3 = MIDI 48). */
export function midiToName(midi: number, lang: "fr" | "en" = "fr"): string {
  const names = lang === "fr" ? NOTE_NAMES_FR : NOTE_NAMES_EN;
  const octave = Math.floor(midi / 12) - 1;
  return `${names[((midi % 12) + 12) % 12]}${octave}`;
}

/** Écart en cents entre une fréquence et une note MIDI cible. */
export function centsOff(freq: number, targetMidi: number): number {
  return (freqToMidi(freq) - targetMidi) * 100;
}

/**
 * Écart en cents ramené dans [-600, 600].
 * Chanter à l'octave n'est pas une faute de justesse : c'est un choix de registre,
 * et le détecteur lui-même se trompe parfois d'octave.
 */
export function foldCents(cents: number): number {
  let c = cents;
  while (c > 600) c -= 1200;
  while (c < -600) c += 1200;
  return c;
}

export function isBlackKey(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12);
}

export const INTERVALS: Record<number, { name: string; short: string }> = {
  0: { name: "Unisson", short: "1" },
  1: { name: "Seconde mineure", short: "2m" },
  2: { name: "Seconde majeure", short: "2M" },
  3: { name: "Tierce mineure", short: "3m" },
  4: { name: "Tierce majeure", short: "3M" },
  5: { name: "Quarte juste", short: "4" },
  6: { name: "Triton", short: "4+" },
  7: { name: "Quinte juste", short: "5" },
  8: { name: "Sixte mineure", short: "6m" },
  9: { name: "Sixte majeure", short: "6M" },
  10: { name: "Septième mineure", short: "7m" },
  11: { name: "Septième majeure", short: "7M" },
  12: { name: "Octave", short: "8" },
};

export const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11, 12];
export const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10, 12];

export const SCALE_PATTERNS: Record<
  "three" | "scale5" | "scale8" | "arpeggio" | "siren" | "thirds",
  { label: string; steps: number[]; description: string }
> = {
  three: { label: "Trois notes", steps: [0, 2, 4, 2, 0], description: "Do Ré Mi Ré Do" },
  scale5: { label: "Cinq notes", steps: [0, 2, 4, 5, 7, 5, 4, 2, 0], description: "Do Ré Mi Fa Sol Fa Mi Ré Do" },
  scale8: { label: "Gamme", steps: [0, 2, 4, 5, 7, 9, 11, 12, 11, 9, 7, 5, 4, 2, 0], description: "Gamme majeure montante et descendante" },
  arpeggio: { label: "Arpège", steps: [0, 4, 7, 12, 7, 4, 0], description: "Do Mi Sol Do Sol Mi Do" },
  siren: { label: "Sirène", steps: [0, 12, 0], description: "Glissando doux sur une octave" },
  thirds: { label: "Tierces", steps: [0, 4, 2, 5, 4, 7, 5, 9, 7, 5, 4, 2, 0], description: "Do Mi Ré Fa Mi Sol …" },
};

/**
 * Zone de travail neutre, avant tout pupitre déclaré et toute observation.
 * Volontairement médiane : ce n'est pas la tessiture d'une voix particulière.
 * Le repère par pupitre vit dans `lib/vocal/voiceParts.ts`.
 */
export const DEFAULT_RANGE = { low: 55, high: 72 }; // Sol3 – Do5

export function clampMidi(midi: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, midi));
}
