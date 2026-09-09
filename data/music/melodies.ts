import type { Melody, MelodyNote } from "./types";

const q = (midi: number | null, lyric?: string, extra?: Partial<MelodyNote>): MelodyNote => ({ midi, beats: 1, lyric, ...extra });
const h = (midi: number | null, lyric?: string, extra?: Partial<MelodyNote>): MelodyNote => ({ midi, beats: 2, lyric, ...extra });
const w = (midi: number | null, lyric?: string, extra?: Partial<MelodyNote>): MelodyNote => ({ midi, beats: 4, lyric, ...extra });
const frag = (label: string, midis: number[]): { label: string; notes: MelodyNote[] } => ({
  label,
  notes: midis.map((m) => q(m)),
});

/** Ligne de ténor de référence du choral « Chante, mon cœur » (Sol3–Do4). */
export const TENOR_LINE_PHRASE_1: MelodyNote[] = [
  h(55, "Chan"), h(55, "te,"),
  h(57, "mon"), h(57, "cœur,"),
  h(60, "la"), h(59, "lu"),
  w(55, "mière", { breath: true }),
];

export const TENOR_LINE_PHRASE_2: MelodyNote[] = [
  h(57, "du"), h(55, "jour ;"),
  h(57, "por"), h(57, "te"),
  h(57, "ta"), h(59, "voix"),
  w(55, "loin.", { breath: true }),
];

export const MELODIES: Melody[] = [
  {
    id: "phrase-breath",
    name: "Phrase avec respiration planifiée",
    bpm: 84,
    beatsPerBar: 4,
    mode: "song",
    phrases: [
      {
        label: "Segment 1",
        notes: [q(55), q(57), q(59), q(60), h(62), h(60, undefined, { breath: true })],
      },
      {
        label: "Segment 2",
        notes: [q(59), q(57), q(55), q(57), w(55, undefined, { breath: true })],
      },
    ],
  },
  {
    id: "phrase-vowels",
    name: "Ligne de 8 notes",
    bpm: 76,
    beatsPerBar: 4,
    mode: "song",
    phrases: [{ label: "Phrase", notes: [q(55), q(57), q(59), q(60), q(62), q(60), q(59), q(57, undefined, { breath: true })] }],
  },
  {
    id: "phrase-shape",
    name: "Phrase avec sommet",
    bpm: 76,
    beatsPerBar: 4,
    mode: "song",
    phrases: [{ label: "Phrase", notes: [q(55), q(57), q(59), q(62), q(64), q(62), q(59), q(55, undefined, { breath: true })] }],
  },
  {
    id: "phrase-rhythm",
    name: "Phrase rythmée",
    bpm: 88,
    beatsPerBar: 4,
    mode: "song",
    phrases: [
      {
        label: "Mesures 1-2",
        notes: [q(55), { midi: 55, beats: 0.5 }, { midi: 57, beats: 0.5 }, h(59), q(60), q(59), h(57, undefined, { breath: true })],
      },
      {
        label: "Mesures 3-4",
        notes: [{ midi: 55, beats: 0.5 }, { midi: 57, beats: 0.5 }, q(59), h(60), w(57, undefined, { breath: true })],
      },
    ],
  },
  {
    id: "phrase-text",
    name: "Le soleil se lève sur la mer",
    bpm: 80,
    beatsPerBar: 4,
    mode: "song",
    text: "Le soleil se lève sur la mer",
    phrases: [
      {
        label: "Phrase",
        notes: [q(55, "Le"), q(57, "so"), q(59, "leil"), q(59, "se"), q(60, "lè"), q(59, "ve"), q(57, "sur"), q(55, "la"), w(55, "mer", { breath: true })],
      },
    ],
  },
  {
    id: "mem-3",
    name: "Fragments de 3 notes",
    bpm: 80,
    beatsPerBar: 4,
    mode: "fragments",
    phrases: [
      frag("Fragment A", [55, 59, 57]),
      frag("Fragment B", [57, 55, 60]),
      frag("Fragment C", [60, 59, 55]),
      frag("Fragment D", [55, 62, 60]),
      frag("Fragment E", [59, 57, 60]),
      frag("Fragment F", [57, 60, 55]),
    ],
  },
  {
    id: "mem-4",
    name: "Cellules de 4 notes",
    bpm: 80,
    beatsPerBar: 4,
    mode: "fragments",
    phrases: [
      frag("Cellule A", [55, 57, 59, 55]),
      frag("Cellule B", [60, 59, 57, 60]),
      frag("Cellule C", [55, 59, 62, 60]),
      frag("Cellule D", [57, 55, 59, 57]),
      frag("Cellule E", [62, 60, 59, 55]),
    ],
  },
  {
    id: "mem-8",
    name: "Phrases de 8 notes",
    bpm: 80,
    beatsPerBar: 4,
    mode: "fragments",
    phrases: [
      frag("Phrase A", [55, 57, 59, 60, 59, 57, 60, 55]),
      frag("Phrase B", [60, 59, 57, 55, 57, 60, 62, 60]),
      frag("Phrase C", [55, 59, 57, 60, 62, 60, 59, 55]),
    ],
  },
  {
    id: "tenor-line-1",
    name: "Ligne de ténor, phrase 1",
    bpm: 72,
    beatsPerBar: 4,
    mode: "song",
    text: "Chante, mon cœur, la lumière",
    phrases: [{ label: "Phrase 1", notes: TENOR_LINE_PHRASE_1 }],
  },
  {
    id: "tenor-line-2",
    name: "Ligne de ténor, phrase 2",
    bpm: 72,
    beatsPerBar: 4,
    mode: "song",
    text: "du jour ; porte ta voix loin.",
    phrases: [{ label: "Phrase 2", notes: TENOR_LINE_PHRASE_2 }],
  },
  {
    id: "tenor-line-full",
    name: "Ligne de ténor complète",
    bpm: 72,
    beatsPerBar: 4,
    mode: "song",
    text: "Chante, mon cœur, la lumière du jour ; porte ta voix loin.",
    phrases: [
      { label: "Phrase 1", notes: TENOR_LINE_PHRASE_1 },
      { label: "Phrase 2", notes: TENOR_LINE_PHRASE_2 },
    ],
  },
];

export const MELODIES_BY_ID: Record<string, Melody> = Object.fromEntries(MELODIES.map((m) => [m.id, m]));
