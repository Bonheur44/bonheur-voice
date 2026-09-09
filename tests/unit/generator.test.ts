import { describe, expect, it } from "vitest";
import { EXERCISES, getExercise } from "@/data/exercises";
import { generateSession, skillWeight, targetDifficulty } from "@/lib/routine/generator";
import { initialSkills } from "@/lib/progression";
import type { Feedback, Level, SkillState } from "@/lib/types";

const base = () => ({ skills: initialSkills(), history: [], date: "2026-09-08" });

describe("generateSession", () => {
  it.each([10, 15, 20, 30, 45])("génère une séance de %i min proche du budget", (min) => {
    const s = generateSession({ ...base(), duration: min * 60, level: 1 });
    const total = s.exercises.reduce((a, e) => a + e.plannedDuration, 0);
    expect(Math.abs(total - min * 60)).toBeLessThanOrEqual(min * 60 * 0.2);
    expect(s.exercises.length).toBeGreaterThanOrEqual(3);
  });

  it("commence par respiration puis échauffement et finit par un retour au calme", () => {
    const s = generateSession({ ...base(), duration: 20 * 60, level: 1 });
    const cats = s.exercises.map((e) => getExercise(e.exerciseId)!);
    expect(cats[0].category).toBe("breathing");
    expect(cats[1].category).toBe("warmup");
    expect(cats[cats.length - 1].cooldown).toBe(true);
  });

  it("est déterministe pour une même date/durée/niveau", () => {
    const a = generateSession({ ...base(), duration: 20 * 60, level: 1 });
    const b = generateSession({ ...base(), duration: 20 * 60, level: 1 });
    expect(a.exercises.map((e) => e.exerciseId)).toEqual(b.exercises.map((e) => e.exerciseId));
  });

  it("ne propose jamais d'exercice au-dessus du niveau", () => {
    for (const level of [1, 2, 3, 4] as Level[]) {
      const s = generateSession({ ...base(), duration: 45 * 60, level });
      for (const e of s.exercises) expect(getExercise(e.exerciseId)!.level).toBeLessThanOrEqual(level);
    }
  });

  it("ne propose pas de registres ni de chorale au niveau 1", () => {
    const s = generateSession({ ...base(), duration: 45 * 60, level: 1 });
    const cats = s.exercises.map((e) => getExercise(e.exerciseId)!.category);
    expect(cats).not.toContain("registers");
    expect(cats).not.toContain("choir");
  });

  it("ne répète pas un exercice dans la même séance", () => {
    const s = generateSession({ ...base(), duration: 45 * 60, level: 4 });
    const ids = s.exercises.map((e) => e.exerciseId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("respecte les bornes de durée de chaque exercice", () => {
    const s = generateSession({ ...base(), duration: 45 * 60, level: 3 });
    for (const e of s.exercises) {
      const ex = getExercise(e.exerciseId)!;
      expect(e.plannedDuration).toBeGreaterThanOrEqual(ex.minDuration ?? ex.duration * 0.6);
      expect(e.plannedDuration).toBeLessThanOrEqual(ex.maxDuration ?? ex.duration * 1.5);
    }
  });
});

describe("adaptation", () => {
  const skill = (score: number, fb: Feedback[]): SkillState => ({ score, feedbackHistory: fb, exercisesDone: fb.length });

  it("baisse la difficulté cible après des retours très difficiles", () => {
    expect(targetDifficulty(skill(40, [1, 2, 1, 2]), 2)).toBeLessThan(targetDifficulty(skill(40, [3, 3, 3, 3]), 2));
  });

  it("monte la difficulté cible après des retours très faciles", () => {
    expect(targetDifficulty(skill(40, [5, 5, 4, 5]), 2)).toBeGreaterThan(targetDifficulty(skill(40, [3, 3, 3, 3]), 2));
  });

  it("borne la difficulté au niveau", () => {
    expect(targetDifficulty(skill(95, [5, 5, 5, 5, 5]), 1)).toBeLessThanOrEqual(2);
  });

  it("donne plus de poids à une compétence faible", () => {
    expect(skillWeight("pitch", skill(20, []), 1)).toBeGreaterThan(skillWeight("pitch", skill(80, []), 1));
  });
});

describe("catalogue", () => {
  it("a des identifiants uniques", () => {
    const ids = EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("a des prérequis valides", () => {
    for (const e of EXERCISES) for (const p of e.prerequisites ?? []) expect(getExercise(p), `${e.id} → ${p}`).toBeDefined();
  });

  it("couvre chaque compétence au niveau 1 ou 2", () => {
    for (const cat of ["breathing", "warmup", "pitch", "stability", "articulation", "musicality"]) {
      expect(EXERCISES.some((e) => e.category === cat && e.level === 1)).toBe(true);
    }
    for (const cat of ["registers", "melody", "choir"]) {
      expect(EXERCISES.some((e) => e.category === cat && e.level === 2)).toBe(true);
    }
  });
});
