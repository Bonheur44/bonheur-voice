import type { ChoralePiece, MelodyNote } from "./types";
import { TENOR_LINE_PHRASE_1, TENOR_LINE_PHRASE_2 } from "./melodies";

const h = (midi: number): MelodyNote => ({ midi, beats: 2 });
const w = (midi: number): MelodyNote => ({ midi, beats: 4 });

/**
 * Choral « Chante, mon cœur » en Do majeur, 8 mesures à 4/4, une harmonie par blanche.
 * Progression : I V6 | vi IV | I64 V | I | IV I6 | IV vi | ii6 V7 | I
 * Écrit pour que la ligne de ténor soit une voix intérieure : notes répétées, mouvements conjoints.
 */
export const CHORALE_1: ChoralePiece = {
  id: "chorale-1",
  name: "Chante, mon cœur (choral à 4 voix)",
  bpm: 72,
  beatsPerBar: 4,
  bars: 8,
  text: "Chante, mon cœur, la lumière du jour ; porte ta voix loin.",
  parts: {
    S: [h(64), h(62), h(64), h(65), h(67), h(67), w(64), h(65), h(67), h(65), h(64), h(65), h(65), w(64)],
    A: [h(60), h(59), h(60), h(60), h(60), h(62), w(60), h(60), h(60), h(60), h(60), h(62), h(62), w(60)],
    T: [...TENOR_LINE_PHRASE_1, ...TENOR_LINE_PHRASE_2],
    B: [h(48), h(47), h(45), h(53), h(55), h(55), w(48), h(53), h(52), h(53), h(45), h(53), h(55), w(48)],
  },
};

export const CHORALES: Record<string, ChoralePiece> = { [CHORALE_1.id]: CHORALE_1 };
