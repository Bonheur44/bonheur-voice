import type { SkillId } from "@/lib/types";
import { addDays, toDayKey } from "@/lib/utils";
import { centsError, freshness, isProduced, stabilityFromSpread } from "@/lib/vocal/observations";
import type { DataConfidence, VocalObservation } from "@/lib/vocal/types";

/**
 * Compétences mesurées.
 *
 * Deux compétences seulement se mesurent au micro : la justesse (écart à la note
 * demandée) et la stabilité (dérive pendant la tenue). Elles sont recalculées à
 * chaque affichage depuis les observations, comme le profil vocal, et pour la
 * même raison : rien de périmé n'est stocké, et une régression fait baisser la
 * valeur au lieu d'être absorbée par un compteur qui ne sait que monter.
 *
 * Les autres compétences — articulation, musicalité, registres, mémoire,
 * indépendance chorale, respiration — n'ont pas de mesure. Elles ne reçoivent
 * donc pas de note : voir `practice.ts`.
 */

export type MeasuredSkillId = "pitch" | "stability";

export const MEASURED_SKILL_IDS: MeasuredSkillId[] = ["pitch", "stability"];

export function isMeasuredSkill(id: SkillId): id is MeasuredSkillId {
  return id === "pitch" || id === "stability";
}

/** En dessous, on préfère dire « données insuffisantes » que donner un chiffre. */
export const MIN_MEASURED_SAMPLES = 6;
/** Une semaine ne se trace que si elle contient assez de mesures pour ne pas être du bruit. */
export const MIN_WEEK_SAMPLES = 4;
/** Fenêtre de comparaison pour la tendance. */
export const TREND_WINDOW_DAYS = 21;
/** En dessous de cet écart, l'évolution est du bruit de mesure. */
export const TREND_MIN_DELTA = 4;

export interface MeasuredSkill {
  id: MeasuredSkillId;
  /** 0–100, null tant que les mesures sont insuffisantes. */
  value: number | null;
  /** Grandeur musicale sous-jacente, en cents : écart absolu moyen ou dérive moyenne. */
  cents: number | null;
  /** Observations exploitables retenues. */
  samples: number;
  confidence: DataConfidence;
  /** Valeur telle qu'elle était il y a `TREND_WINDOW_DAYS` jours, si mesurable. */
  previous: number | null;
  /** value − previous, quand les deux existent. */
  delta: number | null;
  lastAt: string | null;
}

export type MeasuredSkills = Record<MeasuredSkillId, MeasuredSkill>;

/**
 * De l'écart moyen en cents à une valeur 0–100.
 * ±5 cents est indiscernable à l'oreille ; à ±60 cents, on chante une autre note.
 */
export function pitchScoreFromCents(meanAbsCents: number): number {
  if (!Number.isFinite(meanAbsCents)) return 0;
  return Math.round(Math.min(100, Math.max(0, 100 * (1 - (meanAbsCents - 5) / 55))));
}

/** De la dérive moyenne à une valeur 0–100 ; même courbe que le profil vocal. */
export function stabilityScoreFromSpread(meanSpreadCents: number): number {
  return Math.round(100 * stabilityFromSpread(meanSpreadCents));
}

interface Summary {
  pitchCents: number | null;
  stabilityCents: number | null;
  samples: number;
  lastAt: string | null;
}

/** Moyennes pondérées par la fraîcheur, ou null sous le seuil de mesures. */
function summarize(observations: VocalObservation[], now: number, minSamples: number, floor = 0): Summary {
  let weight = 0;
  let pitch = 0;
  let spread = 0;
  let samples = 0;
  let lastAt: string | null = null;

  for (const o of observations) {
    if (!isProduced(o)) continue;
    const w = Math.max(freshness(o.at, now), floor);
    if (w === 0) continue;
    const err = centsError(o);
    if (err === null) continue;
    weight += w;
    samples += 1;
    pitch += w * Math.abs(err);
    spread += w * o.spreadCents;
    if (!lastAt || o.at > lastAt) lastAt = o.at;
  }

  if (samples < minSamples || weight === 0) return { pitchCents: null, stabilityCents: null, samples, lastAt };
  return { pitchCents: pitch / weight, stabilityCents: spread / weight, samples, lastAt };
}

function confidenceOf(samples: number): DataConfidence {
  if (samples < MIN_MEASURED_SAMPLES) return "insufficient";
  if (samples < 15) return "low";
  if (samples < 40) return "moderate";
  return "good";
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * Mesure les deux compétences à partir des observations.
 *
 * La tendance compare l'état actuel à ce qu'il était il y a trois semaines,
 * calculé sur les seules observations qui existaient alors : c'est la valeur
 * que l'utilisateur voyait à l'époque, pas une reconstruction flatteuse.
 */
export function measureSkills(observations: VocalObservation[], now: number = Date.now()): MeasuredSkills {
  const current = summarize(observations, now, MIN_MEASURED_SAMPLES);
  const cutoff = now - TREND_WINDOW_DAYS * DAY;
  const previous = summarize(
    observations.filter((o) => Date.parse(o.at) < cutoff),
    cutoff,
    MIN_MEASURED_SAMPLES,
  );

  const build = (id: MeasuredSkillId): MeasuredSkill => {
    const centsNow = id === "pitch" ? current.pitchCents : current.stabilityCents;
    const centsBefore = id === "pitch" ? previous.pitchCents : previous.stabilityCents;
    const toScore = id === "pitch" ? pitchScoreFromCents : stabilityScoreFromSpread;
    const value = centsNow === null ? null : toScore(centsNow);
    const prev = centsBefore === null ? null : toScore(centsBefore);
    return {
      id,
      value,
      cents: centsNow,
      samples: current.samples,
      confidence: confidenceOf(current.samples),
      previous: prev,
      delta: value !== null && prev !== null ? value - prev : null,
      lastAt: current.lastAt,
    };
  };

  return { pitch: build("pitch"), stability: build("stability") };
}

export const EMPTY_MEASURED: MeasuredSkills = measureSkills([]);

export interface MeasuredWeek {
  weekStart: string;
  pitch: number | null;
  stability: number | null;
  samples: number;
}

/**
 * Valeurs semaine par semaine, pour tracer une évolution.
 * Chaque semaine n'est évaluée que sur ses propres observations : une bonne
 * semaine ancienne ne peut pas embellir une mauvaise semaine récente.
 */
export function measuredHistory(observations: VocalObservation[], weeks = 12, today: string = toDayKey()): MeasuredWeek[] {
  const dow = (new Date(today + "T00:00:00").getDay() + 6) % 7; // lundi = 0
  const thisMonday = addDays(today, -dow);
  const out: MeasuredWeek[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(thisMonday, -7 * i);
    const end = addDays(start, 7);
    const inWeek = observations.filter((o) => {
      const day = toDayKey(new Date(o.at));
      return day >= start && day < end;
    });
    // Évaluée « comme en fin de semaine », avec un plancher de fraîcheur : dans
    // une fenêtre de sept jours la pondération n'a pas de raison d'écarter quoi
    // que ce soit, même pour une semaine vieille de plus d'un an.
    const endTime = new Date(end + "T00:00:00").getTime();
    const s = summarize(inWeek, endTime, MIN_WEEK_SAMPLES, 0.12);
    out.push({
      weekStart: start,
      pitch: s.pitchCents === null ? null : pitchScoreFromCents(s.pitchCents),
      stability: s.stabilityCents === null ? null : stabilityScoreFromSpread(s.stabilityCents),
      samples: s.samples,
    });
  }
  return out;
}

// ------------------------------------------------------------- formulations

export function describeMeasured(m: MeasuredSkill): string {
  if (m.cents === null) {
    const missing = Math.max(0, MIN_MEASURED_SAMPLES - m.samples);
    if (m.samples === 0) return "Aucune mesure au micro pour l'instant.";
    return m.samples + " mesure" + (m.samples > 1 ? "s" : "") + " : encore " + missing + " pour donner un chiffre fiable.";
  }
  const c = Math.round(m.cents);
  return m.id === "pitch" ? "Écart moyen à la note demandée : ±" + c + " cents." : "Dérive moyenne pendant la tenue : " + c + " cents.";
}

export function describeTrend(m: MeasuredSkill): { text: string; direction: "up" | "down" | "flat" } | null {
  if (m.delta === null) return null;
  if (m.delta >= TREND_MIN_DELTA) return { text: "+" + m.delta + " depuis trois semaines", direction: "up" };
  if (m.delta <= -TREND_MIN_DELTA) return { text: m.delta + " depuis trois semaines", direction: "down" };
  return { text: "stable depuis trois semaines", direction: "flat" };
}
