import type { Exercise, SkillId } from "@/lib/types";
import { breathingExercises } from "./breathing";
import { warmupExercises } from "./warmup";
import { pitchExercises } from "./pitch";
import { stabilityExercises } from "./stability";
import { articulationExercises } from "./articulation";
import { registersExercises } from "./registers";
import { musicalityExercises } from "./musicality";
import { melodyExercises } from "./melody";
import { choirExercises } from "./choir";

export const EXERCISES: Exercise[] = [
  ...breathingExercises,
  ...warmupExercises,
  ...pitchExercises,
  ...stabilityExercises,
  ...articulationExercises,
  ...registersExercises,
  ...musicalityExercises,
  ...melodyExercises,
  ...choirExercises,
];

export const EXERCISES_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

/**
 * Anciens identifiants, conservés pour que l'historique reste lisible.
 *
 * Le passage au coach multi-pupitres a renommé les exercices choraux et de
 * mémoire : ils désignaient une ligne de ténor, ils désignent maintenant « ma
 * ligne ». Les séances déjà enregistrées référencent les anciens noms, et une
 * séance passée ne se réécrit pas.
 */
const RENAMED: Record<string, string> = {
  "choir-duo-bass": "choir-duo-support",
  "choir-duo-soprano": "choir-duo-attractor",
  "mel-tenor-line-1": "mel-my-line-1",
  "mel-tenor-line-2": "mel-my-line-2",
  "mel-tenor-full": "mel-my-line-full",
};

export function getExercise(id: string): Exercise | undefined {
  return EXERCISES_BY_ID[id] ?? EXERCISES_BY_ID[RENAMED[id]];
}

export function exercisesByCategory(category: SkillId): Exercise[] {
  return EXERCISES.filter((e) => e.category === category);
}
