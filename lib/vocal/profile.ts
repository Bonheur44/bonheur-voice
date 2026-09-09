import { midiToName } from "@/lib/audio/notes";
import { DATA_CONFIDENCE_LABEL, dataConfidenceOf, estimateParts, evidenceVolume, isAmbiguous } from "./estimation";
import { aggregateNotes, overallAccuracy } from "./observations";
import { analyseRange, bandWidth } from "./rangeAnalysis";
import { VOICE_PARTS } from "./voiceParts";
import type { Band, VocalAnalysis, VocalObservation } from "./types";

export const EMPTY_ANALYSIS: VocalAnalysis = {
  explored: null,
  reliable: null,
  comfortable: null,
  central: null,
  transitions: [],
  notes: [],
  pitchAccuracy: null,
  pitchStability: null,
  attempts: 0,
  distinctNotes: 0,
  dataConfidence: "insufficient",
  estimatedParts: [],
  ambiguous: true,
  lastObservationAt: null,
};

/**
 * Analyse complète du profil vocal.
 *
 * Fonction pure : mêmes observations, même résultat. Rien n'est mémorisé entre
 * deux appels, ce qui garantit qu'aucune conclusion périmée ne survit à de
 * nouvelles données.
 */
export function analyseVocalProfile(observations: VocalObservation[], now: number = Date.now()): VocalAnalysis {
  if (observations.length === 0) return EMPTY_ANALYSIS;

  const notes = aggregateNotes(observations, now);
  const bands = analyseRange(notes);
  const volume = evidenceVolume(notes, bands.reliable, bands.explored);
  const dataConfidence = dataConfidenceOf(volume);
  const estimatedParts = estimateParts(bands.comfortable, bands.explored, dataConfidence);
  const { accuracy, stability } = overallAccuracy(observations, now);

  let lastObservationAt: string | null = null;
  for (const o of observations) if (!lastObservationAt || o.at > lastObservationAt) lastObservationAt = o.at;

  return {
    ...bands,
    notes,
    pitchAccuracy: accuracy,
    pitchStability: stability,
    attempts: volume.attempts,
    distinctNotes: volume.distinctNotes,
    dataConfidence,
    estimatedParts,
    ambiguous: isAmbiguous(estimatedParts),
    lastObservationAt,
  };
}

// ------------------------------------------------------------- formulations

export function formatBand(band: Band | null): string {
  return band ? `${midiToName(band.low)} → ${midiToName(band.high)}` : "—";
}

/** Zone de travail à proposer : le confortable si on le connaît, le fiable sinon. */
export function suggestedWorkingRange(analysis: VocalAnalysis): Band | null {
  const band = analysis.comfortable ?? analysis.reliable;
  if (!band || bandWidth(band) < 5) return null;
  return band;
}

/**
 * Phrase d'estimation, volontairement prudente.
 * Elle dit ce que les données indiquent, jamais ce que l'utilisateur « est ».
 */
export function describeEstimate(analysis: VocalAnalysis): { headline: string; detail: string; caveat?: string } {
  if (analysis.dataConfidence === "insufficient") {
    return {
      headline: "Profil vocal encore indéterminé",
      detail:
        "Il n'y a pas encore assez de notes observées pour proposer une estimation. Fais le test d'étendue vocale, ou quelques exercices avec le micro.",
    };
  }

  const top = analysis.estimatedParts[0];
  if (!top) {
    return {
      headline: "Profil vocal encore indéterminé",
      detail: "Les données recueillies ne permettent pas encore de rapprocher ta voix d'un pupitre.",
    };
  }

  const pct = Math.round(top.confidence * 100);
  const meta = VOICE_PARTS[top.part];

  if (analysis.ambiguous) {
    const second = analysis.estimatedParts[1];
    return {
      headline: "Profil compatible avec plusieurs pupitres",
      detail: second
        ? `Ta zone confortable correspond aussi bien à ${meta.label.toLowerCase()} qu'à ${VOICE_PARTS[second.part].label.toLowerCase()}. Certaines voix ne rentrent pas proprement dans une case, et ce n'est pas un problème.`
        : `Ta zone confortable est compatible avec ${meta.label.toLowerCase()}, sans que ce soit tranché.`,
      caveat: meta.caveat,
    };
  }

  return {
    headline: `${meta.label} — compatibilité ${pct >= 45 ? "élevée" : "modérée"}`,
    detail: `Estimation fondée sur ta zone confortable (${formatBand(analysis.comfortable)}), ta zone centrale (${formatBand(analysis.central)}) et ${analysis.attempts} tentatives. ${DATA_CONFIDENCE_LABEL[analysis.dataConfidence]}.`,
    caveat: meta.caveat,
  };
}

/** Ce qu'il manque pour préciser le profil. */
export function nextStepAdvice(analysis: VocalAnalysis): string {
  switch (analysis.dataConfidence) {
    case "insufficient":
      return "Un test d'étendue de cinq minutes suffit à donner une première image.";
    case "low":
      return "Refais le test dans quelques jours : deux séries d'observations valent bien mieux qu'une.";
    case "moderate":
      return "Continue les exercices au micro : chaque note tenue précise un peu la zone confortable.";
    case "good":
      return "Le profil est bien documenté. Refais une évaluation de temps en temps pour suivre son évolution.";
  }
}

/**
 * Compare deux analyses pour signaler une évolution.
 * Un demi-ton d'écart n'est pas une évolution : c'est du bruit de mesure.
 */
export function describeEvolution(before: VocalAnalysis, after: VocalAnalysis): string | null {
  const a = before.comfortable;
  const b = after.comfortable;
  if (!a || !b) return null;
  const downShift = a.low - b.low;
  const upShift = b.high - a.high;
  if (upShift >= 2 && downShift >= 2) return "Ta zone confortable s'est élargie des deux côtés.";
  if (upShift >= 2) return `Ta zone confortable monte maintenant jusqu'à ${midiToName(b.high)}.`;
  if (downShift >= 2) return `Ta zone confortable descend maintenant jusqu'à ${midiToName(b.low)}.`;
  if (upShift <= -2 || downShift <= -2)
    return "Ta zone confortable s'est resserrée. Fatigue, rhume ou simple journée sans : ce n'est pas un recul.";
  if (before.dataConfidence !== after.dataConfidence && after.dataConfidence !== "insufficient")
    return "Ton profil vocal s'est précisé.";
  return null;
}
