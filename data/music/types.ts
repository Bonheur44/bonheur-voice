/** Note d'une mélodie : hauteur MIDI de référence (null = silence), durée en temps. */
export interface MelodyNote {
  midi: number | null;
  beats: number;
  lyric?: string;
  /** Respiration recommandée après cette note. */
  breath?: boolean;
}

export interface MelodyPhrase {
  label: string;
  notes: MelodyNote[];
}

export interface Melody {
  id: string;
  name: string;
  bpm: number;
  beatsPerBar: number;
  /** "song" : les phrases s'enchaînent ; "fragments" : chaque phrase est un exercice indépendant. */
  mode: "song" | "fragments";
  phrases: MelodyPhrase[];
  text?: string;
}

export type VoicePart = "S" | "A" | "T" | "B";

export interface ChoralePiece {
  id: string;
  name: string;
  bpm: number;
  beatsPerBar: number;
  bars: number;
  /** Chaque voix : liste de notes (MIDI de référence) avec durées en temps. */
  parts: Record<VoicePart, MelodyNote[]>;
  text?: string;
}
