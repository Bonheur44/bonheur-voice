import type { Band, ChoirLine, DeclaredPart, VoicePart } from "./types";

/**
 * Référentiel des pupitres.
 *
 * `comfort` est une **tessiture de travail** : la zone dans laquelle un chœur écrit
 * habituellement cette voix, pas les notes extrêmes qu'elle peut atteindre. C'est
 * volontaire : classer sur les extrêmes est précisément l'erreur que le produit doit
 * éviter. `extent` sert seulement à vérifier qu'une étendue observée n'est pas
 * absurde pour le pupitre.
 *
 * Ces valeurs sont des repères de pratique chorale, pas une norme. Deux personnes du
 * même pupitre peuvent avoir des zones confortables différentes : c'est justement ce
 * que l'analyse cherche à mettre en évidence.
 */
export interface VoicePartMeta {
  id: VoicePart;
  label: string;
  short: string;
  comfort: Band;
  extent: Band;
  /** Ligne travaillée par défaut dans un choral à quatre voix. */
  line: ChoirLine;
  /** Réserve à afficher quand ce pupitre est estimé. */
  caveat?: string;
}

export const VOICE_PARTS: Record<VoicePart, VoicePartMeta> = {
  soprano: {
    id: "soprano",
    label: "Soprano",
    short: "S",
    comfort: { low: 60, high: 79 }, // Do4 – Sol5
    extent: { low: 59, high: 84 }, // Si3 – Do6
    line: "S",
  },
  "mezzo-soprano": {
    id: "mezzo-soprano",
    label: "Mezzo-soprano",
    short: "Mezzo",
    comfort: { low: 57, high: 76 }, // La3 – Mi5
    extent: { low: 55, high: 81 }, // Sol3 – La5
    line: "A",
    caveat: "En chœur, une mezzo chante selon les pièces la seconde soprano ou la première alto.",
  },
  alto: {
    id: "alto",
    label: "Alto",
    short: "A",
    comfort: { low: 53, high: 74 }, // Fa3 – Ré5
    extent: { low: 50, high: 77 }, // Ré3 – Fa5
    line: "A",
  },
  countertenor: {
    id: "countertenor",
    label: "Contre-ténor",
    short: "CT",
    comfort: { low: 55, high: 76 }, // Sol3 – Mi5
    extent: { low: 53, high: 79 }, // Fa3 – Sol5
    line: "A",
    caveat:
      "La hauteur seule ne distingue pas un contre-ténor d'un alto : c'est le mode d'émission qui les sépare, et l'application ne le mesure pas.",
  },
  tenor: {
    id: "tenor",
    label: "Ténor",
    short: "T",
    comfort: { low: 48, high: 67 }, // Do3 – Sol4
    extent: { low: 45, high: 72 }, // La2 – Do5
    line: "T",
  },
  baritone: {
    id: "baritone",
    label: "Baryton",
    short: "Bar",
    comfort: { low: 45, high: 65 }, // La2 – Fa4
    extent: { low: 41, high: 69 }, // Fa2 – La4
    line: "B",
    caveat: "Selon les pièces, un baryton chante la ligne de basse ou celle de ténor.",
  },
  bass: {
    id: "bass",
    label: "Basse",
    short: "B",
    comfort: { low: 40, high: 62 }, // Mi2 – Ré4
    extent: { low: 36, high: 65 }, // Do2 – Fa4
    line: "B",
  },
};

export const VOICE_PART_IDS: VoicePart[] = [
  "soprano",
  "mezzo-soprano",
  "alto",
  "countertenor",
  "tenor",
  "baritone",
  "bass",
];

export const DECLARED_PART_OPTIONS: Array<{ value: DeclaredPart; label: string }> = [
  ...VOICE_PART_IDS.map((id) => ({ value: id as DeclaredPart, label: VOICE_PARTS[id].label })),
  { value: "unknown", label: "Je ne sais pas" },
];

export function isVoicePart(value: unknown): value is VoicePart {
  return typeof value === "string" && value in VOICE_PARTS;
}

export function isDeclaredPart(value: unknown): value is DeclaredPart {
  return value === "unknown" || isVoicePart(value);
}

export function partLabel(part: DeclaredPart): string {
  return part === "unknown" ? "Pupitre à déterminer" : VOICE_PARTS[part].label;
}

/** Ligne SATB travaillée par défaut pour un pupitre déclaré. */
export function defaultLineFor(part: DeclaredPart): ChoirLine {
  return part === "unknown" ? "T" : VOICE_PARTS[part].line;
}

export const CHOIR_LINES: Record<ChoirLine, { id: ChoirLine; label: string; color: string }> = {
  S: { id: "S", label: "Soprano", color: "#f472b6" },
  A: { id: "A", label: "Alto", color: "#a78bfa" },
  T: { id: "T", label: "Ténor", color: "#f59e0b" },
  B: { id: "B", label: "Basse", color: "#38bdf8" },
};

export const CHOIR_LINE_IDS: ChoirLine[] = ["S", "A", "T", "B"];

export function isChoirLine(value: unknown): value is ChoirLine {
  return value === "S" || value === "A" || value === "T" || value === "B";
}

/**
 * Rôles pédagogiques des autres voix, vus depuis la ligne travaillée.
 *
 * - `attractor` : la voix qui « aspire » l'oreille et fait perdre sa ligne. C'est
 *   presque toujours la soprano, qui porte la mélodie ; pour la soprano elle-même,
 *   c'est l'alto, la voix la plus proche.
 * - `support` : la voix la plus facile à combiner, parce qu'elle est en dessous et
 *   bouge peu. La basse, sauf pour la basse elle-même.
 */
export function choirRoles(line: ChoirLine): { attractor: ChoirLine; support: ChoirLine; inner: boolean } {
  const attractor: ChoirLine = line === "S" ? "A" : "S";
  const support: ChoirLine = line === "B" ? "T" : "B";
  return { attractor, support, inner: line === "A" || line === "T" };
}

/** Zone de travail par défaut, avant toute observation. */
export function defaultRangeFor(part: DeclaredPart): Band {
  return part === "unknown" ? { low: 55, high: 72 } : { ...VOICE_PARTS[part].comfort };
}

/** Note de départ raisonnable pour un test d'étendue. */
export function centerFor(part: DeclaredPart): number {
  const band = defaultRangeFor(part);
  return Math.round((band.low + band.high) / 2);
}
