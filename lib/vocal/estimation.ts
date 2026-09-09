import { bandWidth, jaccard, overlapSize } from "./rangeAnalysis";
import { VOICE_PARTS, VOICE_PART_IDS } from "./voiceParts";
import type { Band, DataConfidence, NoteEvidence, PartEstimate } from "./types";

/** Écart en dessous duquel deux pupitres sont considérés comme également compatibles. */
export const AMBIGUITY_MARGIN = 0.06;

export interface EvidenceVolume {
  attempts: number;
  distinctNotes: number;
  reliableNotes: number;
  repeatedNotes: number;
  span: number;
}

export function evidenceVolume(notes: NoteEvidence[], reliable: Band | null, explored: Band | null): EvidenceVolume {
  return {
    attempts: notes.reduce((a, n) => a + n.attempts, 0),
    distinctNotes: notes.filter((n) => n.produced >= 1).length,
    reliableNotes: notes.filter((n) => n.produced >= 1 && n.accuracy >= 0.6).length,
    repeatedNotes: notes.filter((n) => n.produced >= 2).length,
    span: bandWidth(reliable ?? explored),
  };
}

/**
 * Quantité de preuves, indépendamment de leur contenu.
 *
 * C'est délibérément séparé du classement des pupitres : on peut avoir un
 * classement très net sur des données très minces, et il ne faut surtout pas
 * que la netteté du classement passe pour de la certitude.
 */
export function dataConfidenceOf(v: EvidenceVolume): DataConfidence {
  if (v.distinctNotes < 5 || v.attempts < 6 || v.span < 5) return "insufficient";
  if (v.distinctNotes >= 14 && v.attempts >= 30 && v.repeatedNotes >= 6 && v.span >= 12) return "good";
  if (v.distinctNotes >= 9 && v.attempts >= 15 && v.span >= 9) return "moderate";
  return "low";
}

export const DATA_CONFIDENCE_LABEL: Record<DataConfidence, string> = {
  insufficient: "Données insuffisantes",
  low: "Premières données",
  moderate: "Données correctes",
  good: "Données solides",
};

/**
 * Adéquation brute d'une voix observée à un pupitre.
 *
 * Trois critères, aucun ne suffisant seul :
 * - le recouvrement de la zone confortable avec la tessiture de travail du pupitre,
 *   qui est le critère central : c'est là que la voix passe son temps ;
 * - la proximité des centres, qui départage deux pupitres au recouvrement voisin ;
 * - la part de l'étendue explorée qui tient dans l'étendue du pupitre, qui pénalise
 *   une voix nettement plus grave ou plus aiguë que ce que le pupitre demande.
 */
export function fitScore(part: (typeof VOICE_PARTS)[keyof typeof VOICE_PARTS], comfortable: Band, explored: Band | null): number {
  const overlap = jaccard(comfortable, part.comfort);

  const userCenter = (comfortable.low + comfortable.high) / 2;
  const partCenter = (part.comfort.low + part.comfort.high) / 2;
  const centerFit = Math.max(0, 1 - Math.abs(userCenter - partCenter) / 12);

  const reach = explored ? overlapSize(explored, part.extent) / (explored.high - explored.low + 1) : centerFit;

  return 0.55 * overlap + 0.3 * centerFit + 0.15 * reach;
}

/**
 * Classement des pupitres compatibles.
 *
 * La normalisation élève les scores au carré avant de les ramener à une somme de 1 :
 * sans cela, sept pupitres dont un seul convient vraiment se partageraient des
 * confiances trop proches pour être lisibles. Ce sont des parts relatives, pas des
 * probabilités.
 */
export function estimateParts(comfortable: Band | null, explored: Band | null, confidence: DataConfidence): PartEstimate[] {
  if (!comfortable || confidence === "insufficient") return [];

  const scored = VOICE_PART_IDS.map((id) => {
    const fit = fitScore(VOICE_PARTS[id], comfortable, explored);
    return { part: id, fit, weight: Math.pow(Math.max(0, fit), 2) };
  });

  const total = scored.reduce((a, s) => a + s.weight, 0);
  if (total <= 0) return [];

  return scored
    .map(({ part, fit, weight }) => ({ part, fit, confidence: weight / total }))
    .sort((a, b) => b.confidence - a.confidence);
}

/** Vrai quand les deux premiers pupitres sont trop proches pour être départagés. */
export function isAmbiguous(estimates: PartEstimate[]): boolean {
  if (estimates.length < 2) return true;
  return estimates[0].confidence - estimates[1].confidence < AMBIGUITY_MARGIN;
}
