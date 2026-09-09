import type { Level, SkillId } from "./types";

export interface SkillMeta {
  id: SkillId;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  emoji: string;
  /** Score initial estimé à partir du profil. */
  initialScore: number;
  /** Poids de base par niveau (0 = non travaillée à ce niveau). */
  weights: Record<Level, number>;
}

export const SKILLS: Record<SkillId, SkillMeta> = {
  breathing: {
    id: "breathing",
    label: "Respiration",
    shortLabel: "Respir.",
    description: "Contrôle du souffle, débit stable, coordination souffle/voix.",
    color: "#38bdf8",
    emoji: "🌬️",
    initialScore: 30,
    weights: { 1: 1.0, 2: 0.6, 3: 0.4, 4: 0.3 },
  },
  warmup: {
    id: "warmup",
    label: "Échauffement",
    shortLabel: "Échauff.",
    description: "Préparation progressive de la voix et retour au calme.",
    color: "#fbbf24",
    emoji: "🔥",
    initialScore: 40,
    weights: { 1: 0, 2: 0, 3: 0, 4: 0 },
  },
  pitch: {
    id: "pitch",
    label: "Justesse",
    shortLabel: "Justesse",
    description: "Reproduire une note, entendre trop haut / trop bas, intervalles.",
    color: "#a78bfa",
    emoji: "🎯",
    initialScore: 30,
    weights: { 1: 1.0, 2: 0.8, 3: 0.5, 4: 0.4 },
  },
  stability: {
    id: "stability",
    label: "Stabilité",
    shortLabel: "Stabilité",
    description: "Tenir une note droite, sans tremblement ni dérive.",
    color: "#34d399",
    emoji: "📏",
    initialScore: 25,
    weights: { 1: 1.0, 2: 0.7, 3: 0.4, 4: 0.3 },
  },
  articulation: {
    id: "articulation",
    label: "Articulation",
    shortLabel: "Artic.",
    description: "Ouverture, voyelles, consonnes, clarté du texte.",
    color: "#fb923c",
    emoji: "👄",
    initialScore: 35,
    weights: { 1: 0.8, 2: 0.6, 3: 0.4, 4: 0.3 },
  },
  registers: {
    id: "registers",
    label: "Registres",
    shortLabel: "Registres",
    description: "Poitrine, mixte, tête et transitions sans forcer.",
    color: "#f472b6",
    emoji: "🎚️",
    initialScore: 20,
    weights: { 1: 0, 2: 1.0, 3: 0.7, 4: 0.4 },
  },
  musicality: {
    id: "musicality",
    label: "Musicalité",
    shortLabel: "Musical.",
    description: "Legato, résonance, phrasé : chanter plutôt que parler.",
    color: "#facc15",
    emoji: "🎶",
    initialScore: 25,
    weights: { 1: 0.4, 2: 0.9, 3: 0.7, 4: 0.8 },
  },
  melody: {
    id: "melody",
    label: "Mémoire mélodique",
    shortLabel: "Mémoire",
    description: "Apprendre et retenir une ligne, note par note puis phrase par phrase.",
    color: "#22d3ee",
    emoji: "🧠",
    initialScore: 25,
    weights: { 1: 0, 2: 0.8, 3: 1.0, 4: 0.8 },
  },
  choir: {
    id: "choir",
    label: "Indépendance chorale",
    shortLabel: "Chorale",
    description: "Trouver et tenir sa ligne de ténor malgré les autres voix.",
    color: "#f87171",
    emoji: "🎭",
    initialScore: 15,
    weights: { 1: 0, 2: 0.3, 3: 1.0, 4: 1.2 },
  },
};

export const SKILL_ORDER: SkillId[] = [
  "breathing",
  "stability",
  "pitch",
  "articulation",
  "registers",
  "musicality",
  "melody",
  "choir",
];

export const LEVELS: Record<Level, { name: string; tagline: string; focus: SkillId[] }> = {
  1: {
    name: "Fondations",
    tagline: "Souffle, note droite, oreille, ouverture.",
    focus: ["breathing", "stability", "pitch", "articulation"],
  },
  2: {
    name: "Coordination",
    tagline: "Registres, legato, mémoire musicale.",
    focus: ["registers", "musicality", "melody", "pitch"],
  },
  3: {
    name: "Indépendance",
    tagline: "Ta ligne de ténor face aux autres voix.",
    focus: ["melody", "choir", "registers", "musicality"],
  },
  4: {
    name: "Choriste autonome",
    tagline: "Polyphonie, tonalités, mémorisation rapide.",
    focus: ["choir", "melody", "musicality"],
  },
};

export const FEEDBACK_LABELS: Record<1 | 2 | 3 | 4 | 5, { emoji: string; label: string }> = {
  1: { emoji: "😣", label: "Très difficile" },
  2: { emoji: "😕", label: "Difficile" },
  3: { emoji: "🙂", label: "Correct" },
  4: { emoji: "😄", label: "Facile" },
  5: { emoji: "🔥", label: "Très facile" },
};
