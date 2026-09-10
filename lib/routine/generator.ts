import type { Exercise, Feedback, Level, Session, SessionExercise, SkillId, SkillState } from "@/lib/types";
import { EXERCISES } from "@/data/exercises";
import { SKILLS, SKILL_ORDER } from "@/lib/skills";
import { isMeasuredSkill, type MeasuredSkills } from "@/lib/progression/measured";
import { practiceOf, practiceStanding, type Practice } from "@/lib/progression/practice";
import { average, clamp, hashString, seededRandom, uid } from "@/lib/utils";

export interface GeneratorInput {
  /** Durée disponible en secondes. */
  duration: number;
  level: Level;
  skills: Record<SkillId, SkillState>;
  /** Séances passées (pour la variété). */
  history: Session[];
  /** Date du jour, YYYY-MM-DD. */
  date: string;
  /** Graine optionnelle pour régénérer une variante. */
  seed?: number;
  /** Compétences mesurées au micro. Sans elles, seule la pratique dose la séance. */
  measured?: MeasuredSkills;
}

/**
 * Position 0–100 d'une compétence, pour doser la séance.
 *
 * Mesurée quand le micro le permet, sinon déduite de la pratique. Une valeur
 * mesurée basse attire du temps d'entraînement ; une compétence jamais mesurée
 * n'est pas pénalisée, elle est simplement dosée comme les autres.
 */
export function standingOf(id: SkillId, measured: MeasuredSkills | undefined, practice: Practice): number {
  if (measured && isMeasuredSkill(id)) {
    const value = measured[id].value;
    if (value !== null) return value;
  }
  return practiceStanding(practice[id]);
}

/** Difficulté cible d'une compétence selon sa position et les derniers ressentis. */
export function targetDifficulty(skill: SkillState, level: Level, standing: number): number {
  const base = Math.min(5, 1 + Math.floor(standing / 25)); // 0–24 → 1, 25–49 → 2, 50–74 → 3, 75+ → 4
  const recent = skill.feedbackHistory.slice(-5);
  let adjust = 0;
  if (recent.length >= 3) {
    const avg = average(recent);
    if (avg <= 2) adjust = -1;
    else if (avg >= 4.2) adjust = 1;
  }
  const maxForLevel = Math.min(5, level + 1);
  return clamp(base + adjust, 1, maxForLevel);
}

/** Poids d'une compétence dans la séance. */
export function skillWeight(id: SkillId, skill: SkillState, level: Level, standing: number): number {
  const base = SKILLS[id].weights[level];
  if (base === 0) return 0;
  let w = base * (1 + (100 - standing) / 100);
  const recent = skill.feedbackHistory.slice(-5);
  if (recent.length >= 3 && average(recent) >= 4.2) w *= 0.8; // trop facile : un peu moins de temps
  return w;
}

function recentExerciseIds(history: Session[], days = 3): Set<string> {
  const ids = new Set<string>();
  history
    .slice(-days)
    .forEach((s) => s.exercises.forEach((e) => ids.add(e.exerciseId)));
  return ids;
}

function pickExercise(
  candidates: Exercise[],
  target: number,
  recent: Set<string>,
  rnd: () => number,
  exclude: Set<string>,
): Exercise | null {
  const pool = candidates.filter((e) => !exclude.has(e.id));
  if (pool.length === 0) return null;
  const scored = pool.map((e) => {
    let score = 10 - Math.abs(e.difficulty - target) * 3;
    if (recent.has(e.id)) score -= 4;
    score += rnd() * 3;
    return { e, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].e;
}

function scaleDuration(e: Exercise, wanted: number): number {
  const min = e.minDuration ?? Math.round(e.duration * 0.6);
  const max = e.maxDuration ?? Math.round(e.duration * 1.5);
  return Math.round(clamp(wanted, min, max) / 15) * 15;
}

/** Génère la séance du jour. Déterministe pour (date, seed, durée, niveau). */
export function generateSession(input: GeneratorInput): Session {
  const { duration, level, skills, history, date } = input;
  const seed = input.seed ?? hashString(`${date}-${duration}-${level}`);
  const rnd = seededRandom(seed);
  const recent = recentExerciseIds(history);
  const used = new Set<string>();
  const eligible = (cat: SkillId) => EXERCISES.filter((e) => e.category === cat && e.level <= level && !e.cooldown);
  const practice = practiceOf(skills, history);
  const standing = (id: SkillId) => standingOf(id, input.measured, practice);

  const plan: SessionExercise[] = [];
  const short = duration <= 12 * 60;

  // 1. Respiration
  const breathBudget = Math.round(duration * (short ? 0.14 : 0.15));
  const breath = pickExercise(eligible("breathing"), targetDifficulty(skills.breathing, level, standing("breathing")), recent, rnd, used);
  if (breath) {
    used.add(breath.id);
    plan.push({ exerciseId: breath.id, plannedDuration: scaleDuration(breath, breathBudget), completed: false, skipped: false });
  }

  // 2. Échauffement (1 ou 2 exercices selon la durée)
  const warmBudget = Math.round(duration * 0.18);
  const warmCount = duration >= 25 * 60 ? 2 : 1;
  for (let i = 0; i < warmCount; i++) {
    const w = pickExercise(eligible("warmup"), 1 + i, recent, rnd, used);
    if (!w) break;
    used.add(w.id);
    plan.push({ exerciseId: w.id, plannedDuration: scaleDuration(w, warmBudget / warmCount), completed: false, skipped: false });
  }

  // 3. Retour au calme (réservé)
  const coolBudget = Math.round(duration * 0.08);
  const cools = EXERCISES.filter((e) => e.cooldown);
  const cool = cools[Math.floor(rnd() * cools.length)];

  // 4. Blocs de travail
  const usedSoFar = plan.reduce((a, p) => a + p.plannedDuration, 0);
  const workBudget = Math.max(0, duration - usedSoFar - scaleDuration(cool, coolBudget));

  const weights = SKILL_ORDER.map((id) => ({ id, w: skillWeight(id, skills[id], level, standing(id)) })).filter((x) => x.w > 0);
  const totalW = weights.reduce((a, x) => a + x.w, 0);
  const maxBlocks = short ? 2 : duration <= 20 * 60 ? 4 : duration <= 30 * 60 ? 5 : 7;
  // Compétences retenues : les plus pondérées, avec un peu d'aléa pour varier
  const ranked = [...weights].sort((a, b) => b.w + rnd() * 0.3 - (a.w + rnd() * 0.3)).slice(0, maxBlocks);
  const rankedTotal = ranked.reduce((a, x) => a + x.w, 0) || totalW;

  const blocks: SessionExercise[] = [];
  for (const { id, w } of ranked) {
    const budget = Math.round((workBudget * w) / rankedTotal);
    const ex = pickExercise(eligible(id), targetDifficulty(skills[id], level, standing(id)), recent, rnd, used);
    if (!ex) continue;
    used.add(ex.id);
    blocks.push({ exerciseId: ex.id, plannedDuration: scaleDuration(ex, budget), completed: false, skipped: false });
  }

  // Si le budget n'est pas rempli (exercices plafonnés), on ajoute des blocs supplémentaires
  // en repassant sur les compétences par ordre de poids.
  let leftover = workBudget - blocks.reduce((a, b) => a + b.plannedDuration, 0);
  let guard = 0;
  const maxExtra = short ? 0 : 6;
  while (leftover >= 75 && guard < ranked.length * 3 && blocks.length < maxBlocks + maxExtra) {
    const { id } = ranked[guard % ranked.length];
    guard++;
    const ex = pickExercise(eligible(id), targetDifficulty(skills[id], level, standing(id)), recent, rnd, used);
    if (!ex) continue;
    used.add(ex.id);
    const d = scaleDuration(ex, Math.min(leftover, ex.duration));
    blocks.push({ exerciseId: ex.id, plannedDuration: d, completed: false, skipped: false });
    leftover -= d;
  }
  // Ordre pédagogique : suit SKILL_ORDER (justesse avant stabilité ? non : stabilité avant justesse est plus naturel)
  const order: SkillId[] = ["stability", "pitch", "articulation", "registers", "musicality", "melody", "choir"];
  blocks.sort((a, b) => order.indexOf(EXERCISES.find((e) => e.id === a.exerciseId)!.category) - order.indexOf(EXERCISES.find((e) => e.id === b.exerciseId)!.category));
  plan.push(...blocks);

  // 5. Ajustement final pour coller au budget (deux passes, dans les bornes de chaque exercice)
  for (let pass = 0; pass < 2; pass++) {
    const total = plan.reduce((a, p) => a + p.plannedDuration, 0) + scaleDuration(cool, coolBudget);
    const diff = duration - total;
    if (Math.abs(diff) < 30 || blocks.length === 0) break;
    const per = Math.round(diff / blocks.length / 15) * 15;
    if (per === 0) break;
    for (const b of blocks) {
      const ex = EXERCISES.find((e) => e.id === b.exerciseId)!;
      b.plannedDuration = scaleDuration(ex, b.plannedDuration + per);
    }
  }

  plan.push({ exerciseId: cool.id, plannedDuration: scaleDuration(cool, coolBudget), completed: false, skipped: false });

  return {
    id: uid(),
    date,
    plannedDuration: duration,
    level,
    exercises: plan,
    totalDuration: 0,
    seed,
  };
}

export function sessionPlannedTotal(session: Session): number {
  return session.exercises.reduce((a, e) => a + e.plannedDuration, 0);
}

export function summarizeFeedback(fb: Feedback[]): string {
  if (fb.length === 0) return "—";
  const avg = average(fb);
  if (avg < 2) return "Très difficile";
  if (avg < 2.75) return "Difficile";
  if (avg < 3.5) return "Correct";
  if (avg < 4.25) return "Facile";
  return "Très facile";
}
