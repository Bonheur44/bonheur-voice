import { describe, expect, it } from "vitest";
import { getExercise } from "@/data/exercises";
import { buildRecommendations, computeLevel, computeStreak, initialSkills, levelProgress, scoreGain } from "@/lib/progression";
import type { Session } from "@/lib/types";

const session = (date: string, extra: Partial<Session> = {}): Session => ({
  id: date,
  date,
  plannedDuration: 900,
  level: 1,
  exercises: [],
  totalDuration: 900,
  seed: 1,
  completedAt: `${date}T10:00:00.000Z`,
  ...extra,
});

describe("scoreGain", () => {
  const ex = getExercise("stab-sustain-5")!;
  it("récompense davantage un ressenti « correct » qu'un « très difficile »", () => {
    expect(scoreGain(ex, 3, 30, ex.duration)).toBeGreaterThan(scoreGain(ex, 1, 30, ex.duration));
  });
  it("récompense moins un exercice « très facile » qu'un « correct »", () => {
    expect(scoreGain(ex, 5, 30, ex.duration)).toBeLessThan(scoreGain(ex, 3, 30, ex.duration));
  });
  it("a un rendement décroissant", () => {
    expect(scoreGain(ex, 3, 80, ex.duration)).toBeLessThan(scoreGain(ex, 3, 30, ex.duration));
  });
});

describe("computeStreak", () => {
  it("vaut 0 sans séance", () => {
    expect(computeStreak([], "2026-09-08")).toBe(0);
  });
  it("compte les jours consécutifs jusqu'à aujourd'hui", () => {
    const s = [session("2026-09-06"), session("2026-09-07"), session("2026-09-08")];
    expect(computeStreak(s, "2026-09-08")).toBe(3);
  });
  it("survit si la dernière séance date d'hier", () => {
    const s = [session("2026-09-06"), session("2026-09-07")];
    expect(computeStreak(s, "2026-09-08")).toBe(2);
  });
  it("se casse après deux jours sans séance", () => {
    const s = [session("2026-09-05"), session("2026-09-06")];
    expect(computeStreak(s, "2026-09-08")).toBe(0);
  });
});

describe("computeLevel", () => {
  it("démarre au niveau 1", () => {
    expect(computeLevel(initialSkills(), [])).toBe(1);
  });
  it("passe au niveau 2 quand les seuils sont atteints", () => {
    const skills = initialSkills();
    skills.breathing.score = 50;
    skills.stability.score = 45;
    skills.pitch.score = 45;
    const sessions = Array.from({ length: 8 }, (_, i) => session(`2026-09-0${i + 1}`.slice(0, 10)));
    expect(computeLevel(skills, sessions)).toBe(2);
  });
  it("ne saute pas un niveau", () => {
    const skills = initialSkills();
    skills.registers.score = 90;
    skills.musicality.score = 90;
    skills.melody.score = 90;
    const sessions = Array.from({ length: 25 }, (_, i) => session(`2026-08-${String(i + 1).padStart(2, "0")}`));
    expect(computeLevel(skills, sessions)).toBe(1);
  });
  it("calcule une progression vers le niveau suivant", () => {
    const lp = levelProgress(1, initialSkills(), []);
    expect(lp.ratio).toBeGreaterThan(0);
    expect(lp.ratio).toBeLessThan(1);
    expect(lp.details.length).toBe(4);
  });
});

describe("recommandations", () => {
  it("propose une première séance sans historique", () => {
    const recs = buildRecommendations(initialSkills(), [], 1, "2026-09-08");
    expect(recs[0].id).toBe("start");
  });
  it("signale une compétence très difficile", () => {
    const skills = initialSkills();
    skills.pitch.feedbackHistory = [1, 2, 1];
    const recs = buildRecommendations(skills, [session("2026-09-08")], 1, "2026-09-08");
    expect(recs.some((r) => r.id === "hard-pitch")).toBe(true);
  });
  it("signale une inactivité", () => {
    const recs = buildRecommendations(initialSkills(), [session("2026-09-01")], 1, "2026-09-08");
    expect(recs.some((r) => r.id === "inactive")).toBe(true);
  });
});
