import { foldCents } from "@/lib/audio/notes";
import type { Comfort, NoteEvidence, VocalObservation } from "./types";

/** Seuil de clarté en dessous duquel on préfère ne rien conclure. */
export const MIN_CLARITY = 0.82;
/** Une note trop brève ne dit rien de la stabilité. */
export const MIN_HELD_SECONDS = 0.5;
/** Au-delà d'un demi-ton, ce n'est plus la note demandée. */
export const ACCURATE_CENTS = 50;
/** Demi-vie de la pondération : une observation de deux mois pèse moitié moins. */
export const HALF_LIFE_DAYS = 60;
/** Au-delà d'un an, une observation ne dit plus rien de la voix d'aujourd'hui. */
export const MAX_AGE_DAYS = 365;
/** Nombre d'observations conservées. Au-delà, les plus anciennes sont oubliées. */
export const MAX_OBSERVATIONS = 400;

const COMFORT_VALUE: Record<Comfort, number> = {
  easy: 1,
  ok: 0.5,
  strained: -0.6,
  impossible: -1,
};

const DAY = 24 * 60 * 60 * 1000;

export function ageInDays(at: string, now: number): number {
  const t = Date.parse(at);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, (now - t) / DAY);
}

/** Poids d'une observation selon son âge : décroissance douce, jamais nulle. */
export function freshness(at: string, now: number): number {
  const days = ageInDays(at, now);
  if (days > MAX_AGE_DAYS) return 0;
  return Math.max(0.12, Math.pow(0.5, days / HALF_LIFE_DAYS));
}

/** Une observation exploitable : hauteur détectée, clarté et tenue suffisantes. */
export function isProduced(o: VocalObservation): boolean {
  return o.detectedMidi !== null && o.clarity >= MIN_CLARITY && o.heldSeconds >= MIN_HELD_SECONDS;
}

/**
 * Écart à la cible, en cents, avec tolérance d'octave.
 * Chanter à l'octave n'est pas une faute de justesse : c'est un choix de registre.
 */
export function centsError(o: VocalObservation): number | null {
  if (o.detectedMidi === null) return null;
  return foldCents((o.detectedMidi - o.targetMidi) * 100);
}

/** Décalage d'octave entre la note produite et la note demandée. */
export function octaveShift(o: VocalObservation): number {
  if (o.detectedMidi === null) return 0;
  return Math.round((o.detectedMidi - o.targetMidi) / 12);
}

/**
 * Stabilité déduite de la dispersion de hauteur.
 * En dessous de 8 cents, l'oreille n'entend plus de fluctuation ; au-delà de 60,
 * la note vacille franchement.
 */
export function stabilityFromSpread(spreadCents: number): number {
  if (!Number.isFinite(spreadCents)) return 0;
  return Math.min(1, Math.max(0, 1 - (spreadCents - 8) / 52));
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

interface Bucket {
  midi: number;
  weight: number;
  attempts: number;
  produced: number;
  producedWeight: number;
  accurateWeight: number;
  stabilityWeight: number;
  comfortWeight: number;
  comfortSum: number;
  held: number[];
  lastAt: string;
}

/**
 * Agrège les observations en une entrée par demi-ton.
 *
 * L'indexation se fait sur la note **produite** et non sur la note demandée :
 * ce qui renseigne l'étendue, c'est ce que la voix a réellement sorti. Une
 * observation sans hauteur exploitable est tout de même rattachée à la note
 * demandée lorsqu'un confort a été déclaré, sinon elle n'apprend rien.
 */
export function aggregateNotes(observations: VocalObservation[], now: number = Date.now()): NoteEvidence[] {
  const buckets = new Map<number, Bucket>();

  for (const o of observations) {
    const w = freshness(o.at, now);
    if (w === 0) continue;

    const produced = isProduced(o);
    if (!produced && o.comfort === undefined) continue; // ni hauteur, ni ressenti : rien à en tirer

    const midi = produced ? Math.round(o.detectedMidi as number) : Math.round(o.targetMidi);
    let b = buckets.get(midi);
    if (!b) {
      b = {
        midi,
        weight: 0,
        attempts: 0,
        produced: 0,
        producedWeight: 0,
        accurateWeight: 0,
        stabilityWeight: 0,
        comfortWeight: 0,
        comfortSum: 0,
        held: [],
        lastAt: o.at,
      };
      buckets.set(midi, b);
    }

    b.weight += w;
    b.attempts += 1;
    if (o.at > b.lastAt) b.lastAt = o.at;

    if (produced) {
      const err = centsError(o) ?? 0;
      b.produced += 1;
      b.producedWeight += w;
      if (Math.abs(err) <= ACCURATE_CENTS) b.accurateWeight += w;
      b.stabilityWeight += w * stabilityFromSpread(o.spreadCents);
      b.held.push(o.heldSeconds);
    }

    if (o.comfort !== undefined) {
      b.comfortWeight += w;
      b.comfortSum += w * COMFORT_VALUE[o.comfort];
    }
  }

  const out: NoteEvidence[] = [];
  for (const b of buckets.values()) {
    const accuracy = b.producedWeight > 0 ? b.accurateWeight / b.producedWeight : 0;
    const stability = b.producedWeight > 0 ? b.stabilityWeight / b.producedWeight : 0;
    const medianHeld = median(b.held);
    const holdScore = Math.min(1, medianHeld / 2);
    const comfort = b.comfortWeight > 0 ? b.comfortSum / b.comfortWeight : null;
    const quality = b.produced === 0 ? 0 : 0.45 * accuracy + 0.35 * stability + 0.2 * holdScore;
    out.push({
      midi: b.midi,
      weight: b.weight,
      attempts: b.attempts,
      produced: b.produced,
      accuracy,
      stability,
      medianHeld,
      comfort,
      quality,
      lastAt: b.lastAt,
    });
  }

  return out.sort((a, b) => a.midi - b.midi);
}

/**
 * Justesse et stabilité globales, mesurées sur la note **cible** cette fois :
 * il s'agit de savoir si l'utilisateur reproduit ce qu'on lui demande, pas de
 * savoir quelles notes il sait produire.
 */
export function overallAccuracy(
  observations: VocalObservation[],
  now: number = Date.now(),
): { accuracy: number | null; stability: number | null; samples: number } {
  let weight = 0;
  let accurate = 0;
  let stability = 0;
  let samples = 0;

  for (const o of observations) {
    if (!isProduced(o)) continue;
    const w = freshness(o.at, now);
    if (w === 0) continue;
    const err = centsError(o);
    if (err === null) continue;
    weight += w;
    samples += 1;
    // Justesse graduée : parfaite à 0 cent, nulle à un demi-ton.
    accurate += w * Math.max(0, 1 - Math.abs(err) / ACCURATE_CENTS);
    stability += w * stabilityFromSpread(o.spreadCents);
  }

  if (weight === 0) return { accuracy: null, stability: null, samples: 0 };
  return { accuracy: accurate / weight, stability: stability / weight, samples };
}

/** Fenêtre glissante : on borne la mémoire et on oublie ce qui est trop vieux. */
export function trimObservations(observations: VocalObservation[], now: number = Date.now()): VocalObservation[] {
  return observations
    .filter((o) => ageInDays(o.at, now) <= MAX_AGE_DAYS)
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))
    .slice(-MAX_OBSERVATIONS);
}
