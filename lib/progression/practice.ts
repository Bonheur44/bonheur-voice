import { getExercise } from "@/data/exercises";
import { SKILLS } from "@/lib/skills";
import type { Feedback, Session, SkillId, SkillState } from "@/lib/types";

/**
 * Indicateur de pratique.
 *
 * Ce n'est pas un niveau de maîtrise et il ne prétend pas l'être : c'est le
 * décompte de ce qui a été fait, dérivé des séances terminées. Il ne fait que
 * monter, ce qui est normal pour un compteur et serait mensonger pour une
 * compétence. Le ressenti déclaré l'accompagne, étiqueté comme tel.
 */

export interface SkillPractice {
  id: SkillId;
  /** Exercices terminés dans cette compétence. */
  exercises: number;
  /** Temps réellement passé, en secondes. */
  seconds: number;
  /** Jour de la dernière séance ayant travaillé cette compétence. */
  lastDate: string | null;
  /** Dix derniers ressentis déclarés, le plus récent en dernier. */
  feedback: Feedback[];
}

export type Practice = Record<SkillId, SkillPractice>;

export function practiceOf(skills: Record<SkillId, SkillState>, sessions: Session[]): Practice {
  const out = {} as Practice;
  for (const id of Object.keys(SKILLS) as SkillId[]) {
    out[id] = { id, exercises: 0, seconds: 0, lastDate: null, feedback: skills[id]?.feedbackHistory ?? [] };
  }
  for (const s of sessions) {
    if (!s.completedAt) continue;
    for (const e of s.exercises) {
      if (!e.completed) continue;
      const ex = getExercise(e.exerciseId);
      if (!ex) continue;
      const p = out[ex.category];
      p.exercises += 1;
      p.seconds += e.actualDuration ?? 0;
      if (!p.lastDate || s.date > p.lastDate) p.lastDate = s.date;
    }
  }
  return out;
}

/**
 * Position 0–100 d'une compétence que l'on ne mesure pas.
 *
 * Sert uniquement à doser la séance — une compétence peu pratiquée reçoit plus
 * de temps — et n'est jamais affichée : ce serait réintroduire par la fenêtre
 * la note de maîtrise qu'on a sortie par la porte.
 */
export function practiceStanding(p: SkillPractice): number {
  return Math.min(100, p.exercises * 5);
}
