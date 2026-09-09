"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { personalizeExercise } from "@/lib/exercises/personalize";
import type { Exercise } from "@/lib/types";

/** Exercice dont les marqueurs de rôle sont résolus pour la ligne travaillée. */
export function usePersonalizedExercise(exercise: Exercise | undefined): Exercise | undefined {
  const line = useAppStore((s) => s.profile.choirLine);
  return useMemo(() => (exercise ? personalizeExercise(exercise, line) : undefined), [exercise, line]);
}

/** Version liste, pour les catalogues. */
export function usePersonalizedExercises(exercises: Exercise[]): Exercise[] {
  const line = useAppStore((s) => s.profile.choirLine);
  return useMemo(() => exercises.map((e) => personalizeExercise(e, line)), [exercises, line]);
}
