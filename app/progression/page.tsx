"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ActivityGrid, MeasuredTrend, WeeklyBars } from "@/components/charts";
import { SkillsOverview } from "@/components/dashboard/SkillsOverview";
import { DeclaredVsEstimated, VocalProfileCard } from "@/components/vocal/VocalProfileCard";
import { Card, Eyebrow, SectionTitle, Spinner, Stat } from "@/components/ui";
import { ACHIEVEMENTS, completedSessions, computeStreak, dailyActivity, levelProgress, measureSkills, measuredHistory, totalTrainingTime, weeklyStats } from "@/lib/progression";
import { LEVELS } from "@/lib/skills";
import { useAppStore } from "@/lib/store";
import { useHydrated, useLevel } from "@/lib/store/hooks";
import { formatHours } from "@/lib/utils";

export default function ProgressionPage() {
  const hydrated = useHydrated();
  const skills = useAppStore((s) => s.skills);
  const sessions = useAppStore((s) => s.sessions);
  const achievements = useAppStore((s) => s.achievements);
  const observations = useAppStore((s) => s.observations);
  const level = useLevel();
  const measured = useMemo(() => measureSkills(observations), [observations]);
  const history = useMemo(() => measuredHistory(observations), [observations]);

  if (!hydrated) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner />
      </div>
    );
  }

  const done = completedSessions(sessions);
  const streak = computeStreak(sessions);
  const weeks = weeklyStats(sessions, 8);
  const days = dailyActivity(sessions, 28);
  const lp = levelProgress(level, skills, sessions, measured);
  const exercisesDone = done.reduce((a, s) => a + s.exercises.filter((e) => e.completed).length, 0);
  const unlocked = new Set(achievements.map((a) => a.id));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <Eyebrow>Suivi</Eyebrow>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Progression</h1>
        </div>
        <Link href="/history" className="text-sm text-fg-muted underline-offset-2 hover:underline">
          Historique →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Séances" value={done.length} emoji="🎤" />
        <Stat label="Temps" value={formatHours(totalTrainingTime(sessions))} emoji="⏱️" />
        <Stat label="Exercices" value={exercisesDone} emoji="✅" />
        <Stat label="Série" value={`${streak} j`} emoji="🔥" />
      </div>

      <VocalProfileCard />
      <DeclaredVsEstimated />

      <Card>
        <SectionTitle>Compétences</SectionTitle>
        <SkillsOverview />
      </Card>

      <Card>
        <SectionTitle>Évolution mesurée</SectionTitle>
        <MeasuredTrend history={history} />
      </Card>

      <Card>
        <SectionTitle>Niveau {level} · {LEVELS[level].name}</SectionTitle>
        <p className="text-sm text-fg-muted">{LEVELS[level].tagline}</p>
        {level < 4 && (
          <div className="mt-3 space-y-2">
            {lp.details.map((d) => (
              <div key={d.label} className="flex items-center justify-between text-sm">
                <span className="text-fg-muted">{d.label}</span>
                <span className={`font-mono ${d.current !== null && d.current >= d.target ? "text-success" : ""}`}>
                  {d.current ?? "—"} / {d.target}
                  {d.current === null && <span className="ml-2 font-sans text-fg-subtle">données insuffisantes</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>Minutes par semaine</SectionTitle>
        <WeeklyBars data={weeks} />
      </Card>

      <Card>
        <SectionTitle>28 derniers jours</SectionTitle>
        <ActivityGrid data={days} />
      </Card>

      <Card>
        <SectionTitle>Objectifs</SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ACHIEVEMENTS.map((a) => {
            const ok = unlocked.has(a.id);
            return (
              <div key={a.id} className={`rounded-xl border p-3 ${ok ? "border-accent/40 bg-accent-soft" : "border-border bg-surface opacity-60"}`}>
                <div className="text-xl">{ok ? a.emoji : "🔒"}</div>
                <div className="mt-1 text-sm font-medium">{a.title}</div>
                <div className="text-[11px] text-fg-subtle">{a.description}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
