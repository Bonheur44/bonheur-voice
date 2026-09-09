/**
 * Modèle du profil vocal.
 *
 * Règle centrale : seules les observations sont conservées. Tout le reste —
 * bandes, estimations, confiance — est recalculé à la demande par des fonctions
 * pures. Rien de périmé n'est donc jamais stocké, et l'analyse peut toujours
 * répondre « données insuffisantes » plutôt que d'inventer une conclusion.
 */

export type VoicePart =
  | "soprano"
  | "mezzo-soprano"
  | "alto"
  | "countertenor"
  | "tenor"
  | "baritone"
  | "bass";

/** Pupitre déclaré par l'utilisateur, « je ne sais pas » compris. */
export type DeclaredPart = VoicePart | "unknown";

/** Ligne d'un choral à quatre voix. */
export type ChoirLine = "S" | "A" | "T" | "B";

/** Confort ressenti sur une note, déclaré par l'utilisateur. */
export type Comfort = "easy" | "ok" | "strained" | "impossible";

export type ObservationSource = "range-test" | "pitch-test" | "sustain" | "exercise";

/**
 * Une tentative sur une note.
 *
 * `detectedMidi` est la hauteur réellement produite, en MIDI continu (69 = La3).
 * On stocke la hauteur produite plutôt que l'écart à la cible : l'écart s'en
 * déduit, l'inverse est faux. Une octave chantée en dessous est une donnée,
 * pas une erreur à masquer.
 */
export interface VocalObservation {
  id: string;
  /** Note demandée. */
  targetMidi: number;
  /** Hauteur produite, ou null si rien de fiable n'a été détecté. */
  detectedMidi: number | null;
  /** Dispersion de la hauteur pendant la tenue, en cents. */
  spreadCents: number;
  heldSeconds: number;
  /** Confiance du détecteur, 0–1. */
  clarity: number;
  comfort?: Comfort;
  source: ObservationSource;
  /** Horodatage ISO. */
  at: string;
}

/** Ce que l'on sait d'une note précise, tous essais confondus. */
export interface NoteEvidence {
  midi: number;
  /** Nombre de tentatives, pondéré par la fraîcheur. */
  weight: number;
  /** Tentatives brutes, toutes issues confondues. */
  attempts: number;
  /** Tentatives où une hauteur exploitable a été produite. */
  produced: number;
  /** Part des tentatives produites dans ±50 cents de la cible, 0–1. */
  accuracy: number;
  /** Régularité de la hauteur pendant la tenue, 0–1. */
  stability: number;
  /** Durée de tenue médiane, en secondes. */
  medianHeld: number;
  /** Confort déclaré agrégé, de −1 (impossible) à 1 (facile), null si jamais demandé. */
  comfort: number | null;
  /** Synthèse 0–1 : justesse, stabilité, tenue. */
  quality: number;
  lastAt: string;
}

/** Intervalle de notes MIDI, bornes incluses. */
export interface Band {
  low: number;
  high: number;
}

/** Zone où le comportement vocal change nettement. */
export interface TransitionZone {
  low: number;
  high: number;
  /** Contraste avec les zones voisines, 0–1. Plus c'est haut, plus la rupture est nette. */
  strength: number;
}

/** Quantité de preuves accumulées, indépendamment de leur contenu. */
export type DataConfidence = "insufficient" | "low" | "moderate" | "good";

export interface PartEstimate {
  part: VoicePart;
  /** Adéquation brute au pupitre, 0–1. */
  fit: number;
  /** Part relative, normalisée sur les sept pupitres. Somme = 1. */
  confidence: number;
}

export interface VocalAnalysis {
  /** Notes réellement produites. */
  explored: Band | null;
  /** Notes reproduites avec une justesse et une stabilité raisonnables. */
  reliable: Band | null;
  /** Notes fiables et déclarées sans tension excessive. */
  comfortable: Band | null;
  /** Noyau de la zone confortable : là où la voix est la plus assurée. */
  central: Band | null;
  transitions: TransitionZone[];
  notes: NoteEvidence[];
  /** Justesse globale 0–1, mesurée sur la note cible. Null si aucune mesure. */
  pitchAccuracy: number | null;
  /** Stabilité globale 0–1. Null si aucune mesure. */
  pitchStability: number | null;
  attempts: number;
  distinctNotes: number;
  dataConfidence: DataConfidence;
  /** Vide tant que `dataConfidence` vaut « insufficient ». */
  estimatedParts: PartEstimate[];
  /** Vrai quand plusieurs pupitres sont également compatibles. */
  ambiguous: boolean;
  lastObservationAt: string | null;
}

/** Ce qui est réellement persisté. */
export interface VocalProfileData {
  observations: VocalObservation[];
  /** Fin de la dernière évaluation d'étendue menée à son terme. */
  lastRangeTestAt?: string;
}
