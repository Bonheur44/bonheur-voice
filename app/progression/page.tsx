"use client";

import Link from "next/link";
import { ActivityGrid, SkillRadar, WeeklyBars } from "@/components/charts";
import { SkillBars } from "@/components/dashboard/SkillBars";
import { Card, Eyebrow, SectionTitle, Spinner, Stat } from "@/components/ui";
import { ACHIEVEMENTS, completedSessions, computeStreak, dailyActivity, levelProgress, totalTrainingTime, weeklyStats } from "@/lib/progression";
import { FEEDBACK_LABELS, LEVELS, SKILLS, SKILL_ORDER } from "@/lib/skills";
import { useAppStore } from "@/lib/store";
import { useHydrated, useLevel } from "@/lib/store/hooks";
import { average, formatHours } from "@/lib/utils";
import { summarizeFeedback } from "@/lib/routine/generator";

export default function ProgressionPage() {
  const hydrated = useHydrated();
  const skills = useAppStore((s) => s.skills);
  const sessions = useAppStore((s) => s.sessions);
  const achievements = useAppStore((s) => s.achievements);
  const level = useLevel();

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
  const allFeedback = done.flatMap((s) => s.exercises.filter((e) => e.feedback).map((e) => e.feedback!));
  const avgFb = average(allFeedback);
  const lp = levelProgress(level, skills, sessions);
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

      <Card>
        <SectionTitle>Compétences</SectionTitle>
        <div className="grid gap-6 md:grid-cols-2 md:items-center">
          <SkillRadar skills={skills} />
          <SkillBars skills={skills} compact />
        </div>
      </Card>

      <Card>
        <SectionTitle>Niveau {level} · {LEVELS[level].name}</SectionTitle>
        <p className="text-sm text-fg-muted">{LEVELS[level].tagline}</p>
        {level < 4 && (
          <div className="mt-3 space-y-2">
            {lp.details.map((d) => (
              <div key={d.label} className="flex items-center justify-between text-sm">
                <span className="text-fg-muted">{d.label}</span>
                <span className={`font-mono ${d.current >= d.target ? "text-success" : ""}`}>
                  {d.current} / {d.target}
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
        <SectionTitle>Ressenti par compétence</SectionTitle>
        {allFeedback.length === 0 ? (
          <p className="text-sm text-fg-muted">Aucun retour pour l&apos;instant.</p>
        ) : (
          <div className="space-y-2">
            <div className="text-sm text-fg-muted">
              Moyenne générale : <span className="font-mono text-fg">{avgFb.toFixed(1)} / 5</span> · {summarizeFeedback(allFeedback)}
            </div>
            <ul className="divide-y divide-border">
              {SKILL_ORDER.map((id) => {
                const fb = skills[id].feedbackHistory;
                if (fb.length === 0) return null;
                const last = fb[fb.length - 1];
                return (
                  <li key={id} className="flex items-center justify-between py-2 text-sm">
                    <span>
                      {SKILLS[id].emoji} {SKILLS[id].label}
                    </span>
                    <span className="text-fg-muted">
                      {summarizeFeedback(fb)} · dernier {FEEDBACK_LABELS[last].emoji} · {skills[id].exercisesDone} ex.
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
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
