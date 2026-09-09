import { CHORALES } from "./chorale";
import { MELODIES_BY_ID } from "./melodies";
import type { Melody, MelodyNote, VoicePart } from "./types";

/**
 * Mélodies « ma ligne », construites à la demande depuis un choral.
 *
 * Plutôt que d'écrire une mélodie par pupitre — quatre versions du même exercice
 * à maintenir —, on extrait la ligne demandée du choral existant. Les paroles
 * sont communes aux quatre voix : elles sont donc appliquées par position.
 *
 * Identifiants reconnus : `my-line-1`, `my-line-2`, `my-line-full`.
 */

const MY_LINE_PREFIX = "my-line";

/** Paroles du choral, une entrée par note, phrase par phrase. */
const LYRICS: string[][] = [
  ["Chan", "te,", "mon", "cœur,", "la", "lu", "mière"],
  ["du", "jour ;", "por", "te", "ta", "voix", "loin."],
];

const PHRASE_TEXT = ["Chante, mon cœur, la lumière", "du jour ; porte ta voix loin."];

function phraseNotes(notes: MelodyNote[], phrase: number): MelodyNote[] {
  const size = LYRICS[phrase]?.length ?? 0;
  const slice = notes.slice(phrase * size, (phrase + 1) * size);
  return slice.map((n, i) => ({
    ...n,
    lyric: LYRICS[phrase]?.[i],
    // Respiration à la fin de chaque phrase.
    breath: i === slice.length - 1 ? true : n.breath,
  }));
}

export function isMyLineId(id: string): boolean {
  return id.startsWith(MY_LINE_PREFIX);
}

/**
 * Résout un identifiant de mélodie pour la ligne travaillée.
 * Les identifiants ordinaires sont renvoyés tels quels.
 */
export function resolveMelody(id: string, line: VoicePart, pieceId = "chorale-1"): Melody | undefined {
  if (!isMyLineId(id)) return MELODIES_BY_ID[id];

  const piece = CHORALES[pieceId];
  if (!piece) return undefined;
  const notes = piece.parts[line];
  if (!notes || notes.length === 0) return undefined;

  const which = id.slice(MY_LINE_PREFIX.length + 1); // "1", "2" ou "full"
  const phrases =
    which === "full"
      ? LYRICS.map((_, i) => ({ label: `Phrase ${i + 1}`, notes: phraseNotes(notes, i) }))
      : [{ label: `Phrase ${which}`, notes: phraseNotes(notes, Number(which) - 1) }];

  const valid = phrases.filter((p) => p.notes.length > 0);
  if (valid.length === 0) return undefined;

  const text = which === "full" ? PHRASE_TEXT.join(" ") : PHRASE_TEXT[Number(which) - 1];

  return {
    id,
    name: which === "full" ? "Ma ligne, en entier" : `Ma ligne, phrase ${which}`,
    bpm: piece.bpm,
    beatsPerBar: piece.beatsPerBar,
    mode: "song",
    text,
    phrases: valid,
  };
}
