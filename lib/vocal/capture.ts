import { uid } from "@/lib/utils";
import type { Comfort, ObservationSource, VocalObservation } from "./types";

/**
 * Passage des trames du détecteur à une observation.
 *
 * Partagé par le test d'étendue et par les exercices au micro : une note tenue
 * dans « Trouve la note » doit produire exactement la même observation qu'une
 * note tenue pendant le test, sinon les deux sources ne seraient pas comparables
 * et les compétences mesurées mélangeraient des grandeurs différentes.
 */

/** Clarté minimale d'une trame pour être retenue. Même seuil dans tous les widgets. */
export const MIN_FRAME_CLARITY = 0.85;
export const MIN_FRAME_LEVEL = 0.03;

export interface Capture {
  detectedMidi: number;
  spreadCents: number;
  heldSeconds: number;
  clarity: number;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Dispersion robuste, en cents : écart absolu médian mis à l'échelle.
 * Une attaque un peu basse ou une fin de note qui retombe ne doivent pas faire
 * passer une tenue correcte pour instable.
 */
export function robustSpreadCents(midis: number[], center: number): number {
  const deviations = midis.map((m) => Math.abs(m - center) * 100);
  return 1.4826 * median(deviations);
}

/**
 * Résume une série de trames valides en une capture, ou renonce s'il y en a
 * trop peu pour conclure. La hauteur retenue est la médiane : elle ignore les
 * trames aberrantes qu'une moyenne aurait suivies.
 */
export function summarizeFrames(midis: number[], clarities: number[], heldSeconds: number, minFrames: number): Capture | null {
  if (midis.length < minFrames) return null;
  const center = median(midis);
  return {
    detectedMidi: center,
    spreadCents: robustSpreadCents(midis, center),
    heldSeconds: Math.max(0, heldSeconds),
    clarity: clarities.length ? clarities.reduce((a, c) => a + c, 0) / clarities.length : 0,
  };
}

/** Une capture absente donne tout de même une observation, si un confort a été déclaré. */
export function observationFrom(targetMidi: number, capture: Capture | null, source: ObservationSource, comfort?: Comfort): VocalObservation {
  return {
    id: uid(),
    targetMidi,
    detectedMidi: capture?.detectedMidi ?? null,
    spreadCents: capture?.spreadCents ?? 0,
    heldSeconds: capture?.heldSeconds ?? 0,
    clarity: capture?.clarity ?? 0,
    comfort,
    source,
    at: new Date().toISOString(),
  };
}
