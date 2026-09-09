import type { SkillId } from "@/lib/types";

/**
 * Batterie d'évaluation.
 *
 * Chaque test produit des observations exploitables par le profil vocal et par le
 * générateur de séance. Le statut est explicite : afficher un test « bientôt »
 * vaut mieux que laisser croire qu'il mesure déjà quelque chose.
 */
export type AssessmentId =
  | "range"
  | "pitch"
  | "stability"
  | "ear"
  | "intervals"
  | "memory"
  | "independence"
  | "comfort";

export type AssessmentStatus = "available" | "planned";

export interface AssessmentMeta {
  id: AssessmentId;
  order: number;
  name: string;
  question: string;
  /** Ce que le test observe réellement, sans promesse excessive. */
  measures: string;
  emoji: string;
  /** Durée indicative, en minutes. */
  minutes: number;
  needsMic: boolean;
  status: AssessmentStatus;
  /** Compétence alimentée par le test, quand il y en a une. */
  skill?: SkillId;
  href?: string;
}

export const ASSESSMENTS: Record<AssessmentId, AssessmentMeta> = {
  range: {
    id: "range",
    order: 1,
    name: "Étendue vocale",
    question: "Quelles zones de ma voix sont accessibles, fiables et confortables ?",
    measures:
      "Les notes que tu produis, celles que tu reproduis avec justesse et stabilité, et celles que tu déclares confortables.",
    emoji: "📐",
    minutes: 6,
    needsMic: true,
    status: "available",
    href: "/assessment/range",
  },
  pitch: {
    id: "pitch",
    order: 2,
    name: "Justesse",
    question: "Est-ce que je reproduis la note demandée ?",
    measures: "L'écart moyen à la note cible, sur toute la zone de travail.",
    emoji: "🎯",
    minutes: 5,
    needsMic: true,
    status: "planned",
    skill: "pitch",
  },
  stability: {
    id: "stability",
    order: 3,
    name: "Stabilité",
    question: "Est-ce que je tiens une note droite ?",
    measures: "La fluctuation de hauteur pendant une tenue, et sa durée.",
    emoji: "📏",
    minutes: 4,
    needsMic: true,
    status: "planned",
    skill: "stability",
  },
  ear: {
    id: "ear",
    order: 4,
    name: "Oreille",
    question: "Est-ce que j'entends si je suis trop haut ou trop bas ?",
    measures: "La reconnaissance de la direction d'un écart, sans micro.",
    emoji: "👂",
    minutes: 4,
    needsMic: false,
    status: "planned",
    skill: "pitch",
  },
  intervals: {
    id: "intervals",
    order: 5,
    name: "Intervalles",
    question: "Est-ce que je reconnais et reproduis les intervalles ?",
    measures: "La justesse sur des sauts d'intervalle croissants.",
    emoji: "🪜",
    minutes: 5,
    needsMic: true,
    status: "planned",
    skill: "pitch",
  },
  memory: {
    id: "memory",
    order: 6,
    name: "Mémoire mélodique",
    question: "Combien de notes puis-je retenir et restituer ?",
    measures: "La longueur de phrase restituée correctement après une écoute.",
    emoji: "🧠",
    minutes: 5,
    needsMic: true,
    status: "planned",
    skill: "melody",
  },
  independence: {
    id: "independence",
    order: 7,
    name: "Indépendance chorale",
    question: "Est-ce que je tiens ma ligne quand les autres voix chantent ?",
    measures: "La justesse sur ta ligne, à mesure qu'on ajoute les autres voix.",
    emoji: "🎭",
    minutes: 6,
    needsMic: true,
    status: "planned",
    skill: "choir",
  },
  comfort: {
    id: "comfort",
    order: 8,
    name: "Confort par zone",
    question: "Où ma voix est-elle le plus à l'aise ?",
    measures: "Le ressenti déclaré, zone par zone, comparé aux mesures.",
    emoji: "🛋️",
    minutes: 4,
    needsMic: false,
    status: "planned",
  },
};

export const ASSESSMENT_ORDER: AssessmentId[] = (Object.keys(ASSESSMENTS) as AssessmentId[]).sort(
  (a, b) => ASSESSMENTS[a].order - ASSESSMENTS[b].order,
);
