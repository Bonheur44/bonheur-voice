import type { ChoralePiece, MelodyNote } from "./types";
import { CHORALE_1_TENOR_1, CHORALE_1_TENOR_2 } from "./melodies";

const h = (midi: number): MelodyNote => ({ midi, beats: 2 });
const w = (midi: number): MelodyNote => ({ midi, beats: 4 });

/**
 * Choral « Chante, mon cœur » en Do majeur, 8 mesures à 4/4, une harmonie par blanche.
 * Progression : I V6 | vi IV | I64 V | I | IV I6 | IV vi | ii6 V7 | I
 * Écriture chorale classique : les voix intérieures (alto, ténor) procèdent par notes répétées et
 * mouvements conjoints, les voix extrêmes portent la mélodie et la basse harmonique. Chacune des
 * quatre lignes peut donc servir d'exercice, avec une difficulté propre.
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
    T: [...CHORALE_1_TENOR_1, ...CHORALE_1_TENOR_2],
    B: [h(48), h(47), h(45), h(53), h(55), h(55), w(48), h(53), h(52), h(53), h(45), h(53), h(55), w(48)],
  },
};

export const CHORALES: Record<string, ChoralePiece> = { [CHORALE_1.id]: CHORALE_1 };
