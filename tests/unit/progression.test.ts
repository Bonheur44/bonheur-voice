import { describe, expect, it } from "vitest";
import { EXERCISES } from "@/data/exercises";
import { EMPTY_MEASURED, buildRecommendations, computeLevel, computeStreak, initialSkills, levelProgress, practiceOf, type MeasuredSkills } from "@/lib/progression";
import type { Session, SkillId } from "@/lib/types";
import { addDays } from "@/lib/utils";

const session = (date: string, extra: Partial<Session> = {}): Session => ({
  id: date + (extra.id ?? ""),
  date,
  plannedDuration: 900,
  level: 1,
  exercises: [],
  totalDuration: 900,
  seed: 1,
  completedAt: `${date}T10:00:00.000Z`,
  ...extra,
});

const exerciseOf = (category: SkillId) => EXERCISES.find((e) => e.category === category)!.id;

/** Séance terminée comportant `n` exercices terminés d'une compétence. */
const practised = (date: string, category: SkillId, n = 1, extra: Partial<Session> = {}): Session =>
  session(date, {
    exercises: Array.from({ length: n }, () => ({ exerciseId: exerciseOf(category), plannedDuration: 120, actualDuration: 120, completed: true, skipped: false })),
    ...extra,
  });

const dates = (n: number, from = "2026-08-01") => Array.from({ length: n }, (_, i) => addDays(from, i));

const measured = (pitch: number | null, stability: number | null): MeasuredSkills => ({
  pitch: { ...EMPTY_MEASURED.pitch, value: pitch, samples: pitch === null ? 0 : 10, confidence: pitch === null ? "insufficient" : "low" },
  stability: { ...EMPTY_MEASURED.stability, value: stability, samples: stability === null ? 0 : 10, confidence: stability === null ? "insufficient" : "low" },
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

describe("practiceOf", () => {
  it("compte les exercices terminés et le temps passé, par compétence", () => {
    const sessions = [practised("2026-09-01", "breathing", 2), practised("2026-09-03", "breathing", 1), practised("2026-09-02", "pitch", 1)];
    const p = practiceOf(initialSkills(), sessions);
    expect(p.breathing.exercises).toBe(3);
    expect(p.breathing.seconds).toBe(360);
    expect(p.breathing.lastDate).toBe("2026-09-03");
    expect(p.pitch.exercises).toBe(1);
    expect(p.choir.exercises).toBe(0);
    expect(p.choir.lastDate).toBeNull();
  });

  it("ignore les exercices sautés et les séances non terminées", () => {
    const skipped = session("2026-09-01", {
      exercises: [{ exerciseId: exerciseOf("breathing"), plannedDuration: 120, completed: false, skipped: true }],
    });
    const open = practised("2026-09-02", "breathing", 3, { completedAt: undefined });
    const p = practiceOf(initialSkills(), [skipped, open]);
    expect(p.breathing.exercises).toBe(0);
  });
});

describe("computeLevel", () => {
  it("démarre au niveau 1", () => {
    expect(computeLevel(initialSkills(), [], EMPTY_MEASURED)).toBe(1);
  });

  it("passe au niveau 2 quand mesures et pratique suffisent", () => {
    const sessions = dates(8).map((d) => practised(d, "breathing"));
    expect(computeLevel(initialSkills(), sessions, measured(45, 45))).toBe(2);
  });

  it("refuse le niveau 2 sans mesure au micro, même après cent séances", () => {
    const sessions = dates(100, "2026-01-01").map((d) => practised(d, "breathing"));
    expect(computeLevel(initialSkills(), sessions, EMPTY_MEASURED)).toBe(1);
    expect(computeLevel(initialSkills(), sessions, measured(90, null))).toBe(1);
  });

  it("ne saute pas un niveau", () => {
    // Tout pour le niveau 3, sauf la respiration exigée au niveau 2.
    const sessions = dates(25).map((d, i) => practised(d, (["registers", "musicality", "melody"] as SkillId[])[i % 3]));
    expect(computeLevel(initialSkills(), sessions, measured(90, 90))).toBe(1);
  });

  it("ne justifie plus un niveau quand la mesure recule", () => {
    // La fonction est pure : c'est le store qui décide de ne pas faire redescendre le niveau atteint.
    const sessions = dates(8).map((d) => practised(d, "breathing"));
    expect(computeLevel(initialSkills(), sessions, measured(45, 45))).toBe(2);
    expect(computeLevel(initialSkills(), sessions, measured(30, 45))).toBe(1);
  });

  it("détaille la progression, avec « données insuffisantes » pour une compétence non mesurée", () => {
    const lp = levelProgress(1, initialSkills(), [session("2026-09-01")], EMPTY_MEASURED);
    expect(lp.details.length).toBe(4);
    expect(lp.details.find((d) => d.kind === "measured")?.current).toBeNull();
    expect(lp.details.find((d) => d.kind === "sessions")?.current).toBe(1);
    expect(lp.ratio).toBeGreaterThan(0);
    expect(lp.ratio).toBeLessThan(1);
  });
});

describe("recommandations", () => {
  it("propose une première séance sans historique", () => {
    const recs = buildRecommendations(initialSkills(), [], 1, EMPTY_MEASURED, "2026-09-08");
    expect(recs[0].id).toBe("start");
  });

  it("signale une compétence très difficile", () => {
    const skills = initialSkills();
    skills.pitch.feedbackHistory = [1, 2, 1];
    const recs = buildRecommendations(skills, [session("2026-09-08")], 1, EMPTY_MEASURED, "2026-09-08");
    expect(recs.some((r) => r.id === "hard-pitch")).toBe(true);
  });

  it("signale une inactivité", () => {
    const recs = buildRecommendations(initialSkills(), [session("2026-09-01")], 1, EMPTY_MEASURED, "2026-09-08");
    expect(recs.some((r) => r.id === "inactive")).toBe(true);
  });

  it("invite à mesurer une fois la routine installée, pas dès la première séance", () => {
    const one = buildRecommendations(initialSkills(), [session("2026-09-08")], 1, EMPTY_MEASURED, "2026-09-08");
    expect(one.some((r) => r.id === "measure")).toBe(false);
    const two = buildRecommendations(initialSkills(), [session("2026-09-07"), session("2026-09-08")], 1, EMPTY_MEASURED, "2026-09-08");
    expect(two.some((r) => r.id === "measure")).toBe(true);
  });

  it("dit un recul mesuré aussi franchement qu'un progrès", () => {
    const drop = { ...measured(50, 60), pitch: { ...measured(50, 60).pitch, previous: 62, delta: -12 } };
    const down = buildRecommendations(initialSkills(), [session("2026-09-08")], 1, drop, "2026-09-08");
    expect(down[0].id).toBe("drop-pitch");
    expect(down[0].tone).toBe("warning");

    const rise = { ...measured(70, 60), pitch: { ...measured(70, 60).pitch, previous: 58, delta: 12 } };
    const up = buildRecommendations(initialSkills(), [session("2026-09-08")], 1, rise, "2026-09-08");
    expect(up[0].id).toBe("rise-pitch");
  });
});
