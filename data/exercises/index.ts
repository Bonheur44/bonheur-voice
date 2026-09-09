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

export function getExercise(id: string): Exercise | undefined {
  return EXERCISES_BY_ID[id];
}

export function exercisesByCategory(category: SkillId): Exercise[] {
  return EXERCISES.filter((e) => e.category === category);
}
