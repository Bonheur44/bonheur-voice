"use client";

import Link from "next/link";
import { useEffect } from "react";
import { SkillBars } from "@/components/dashboard/SkillBars";
import { SessionPlan } from "@/components/routine/SessionPlan";
import { Badge, Callout, Card, Eyebrow, LinkButton, ProgressBar, SectionTitle, Spinner, Stat } from "@/components/ui";
import { getExercise } from "@/data/exercises";
import { buildRecommendations, completedSessions, computeStreak, levelProgress, totalTrainingTime } from "@/lib/progression";
import { FEEDBACK_LABELS, LEVELS } from "@/lib/skills";
import { useAppStore } from "@/lib/store";
import { useHydrated, useLevel } from "@/lib/store/hooks";
import { formatDayKey, formatDuration, formatHours, toDayKey } from "@/lib/utils";

export default function DashboardPage() {
  const hydrated = useHydrated();
  const profile = useAppStore((s) => s.profile);
  const skills = useAppStore((s) => s.skills);
  const sessions = useAppStore((s) => s.sessions);
  const current = useAppStore((s) => s.currentSession);
  const ensure = useAppStore((s) => s.ensureTodaySession);
  const level = useLevel();
  const hasDoneToday = useAppStore((s) => s.sessions.some((x) => !!x.completedAt && x.date === toDayKey()));

  // On prépare la séance du jour, sauf si une séance a déjà été terminée aujourd'hui (l'utilisateur en relance une s'il le souhaite).
  useEffect(() => {
    if (hydrated && profile.onboarded && !hasDoneToday) ensure();
  }, [hydrated, profile.onboarded, hasDoneToday, ensure]);

  if (!hydrated) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner />
      </div>
    );
  }

  const today = toDayKey();
  const done = completedSessions(sessions);
  const streak = computeStreak(sessions);
  const totalTime = totalTrainingTime(sessions);
  const recs = buildRecommendations(skills, sessions, level);
  const lp = levelProgress(level, skills, sessions);
  const todayDone = done.filter((s) => s.date === today);
  const session = current && current.date === today ? current : null;
  const started = !!session?.startedAt;
  const recentExercises = [...done]
    .reverse()
    .flatMap((s) => s.exercises.filter((e) => e.completed).map((e) => ({ ...e, date: s.date })))
    .slice(0, 5);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <Eyebrow>{formatDayKey(today)}</Eyebrow>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{greeting} 👋</h1>
        </div>
        <Badge color="#f59e0b">Niveau {level} · {LEVELS[level].name}</Badge>
      </div>

      {/* Séance du jour */}
      <Card glow className="relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/10 blur-2xl" aria-hidden />
        <div className="flex items-start justify-between gap-3">
          <div>
            <Eyebrow>Séance du jour</Eyebrow>
            <h2 className="mt-1 text-xl font-semibold">
              {todayDone.length > 0 && !session ? "Séance terminée ✓" : started ? "Séance en cours" : `${formatDuration(session?.plannedDuration ?? profile.preferredDuration)}`}
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              {todayDone.length > 0 && !session
                ? `Bravo. ${formatDuration(todayDone.reduce((a, s) => a + s.totalDuration, 0))} aujourd'hui. Tu peux en refaire une plus courte si ta voix est fraîche.`
                : session
                  ? `${session.exercises.length} exercices · ${LEVELS[level].tagline}`
                  : "Préparation…"}
            </p>
          </div>
        </div>
        {session && (
          <div className="mt-4">
            <SessionPlan session={session} compact />
          </div>
        )}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <LinkButton href="/routine/play" size="lg" full>
            {started ? "▶ Reprendre la séance" : todayDone.length > 0 && !session ? "▶ Nouvelle séance" : "▶ Commencer"}
          </LinkButton>
          <LinkButton href="/routine" size="lg" variant="secondary" full>
            Ajuster la durée
          </LinkButton>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Série" value={`${streak} j`} emoji="🔥" hint={streak === 0 ? "Commence aujourd'hui" : streak === 1 ? "Premier jour" : "jours consécutifs"} />
        <Stat label="Temps total" value={formatHours(totalTime)} emoji="⏱️" hint={`${done.length} séance${done.length > 1 ? "s" : ""}`} />
        <Stat label="Niveau" value={`${level} / 4`} emoji="🎓" hint={LEVELS[level].name} />
        <Stat label="Vers niveau suivant" value={`${Math.round(lp.ratio * 100)}%`} emoji="📈" hint={level >= 4 ? "Niveau maximal" : `Niveau ${level + 1}`} />
      </div>

      {/* Recommandation */}
      {recs.length > 0 && (
        <Callout tone={recs[0].tone} title={recs[0].title}>
          {recs[0].message}
        </Callout>
      )}

      {/* Compétences */}
      <Card>
        <SectionTitle
          action={
            <Link href="/progression" className="text-xs text-fg-muted underline-offset-2 hover:underline">
              Détails →
            </Link>
          }
        >
          Mes compétences
        </SectionTitle>
        <SkillBars skills={skills} />
      </Card>

      {/* Vers le niveau suivant */}
      {level < 4 && (
        <Card>
          <SectionTitle>Vers le niveau {level + 1} · {LEVELS[(level + 1) as 2 | 3 | 4].name}</SectionTitle>
          <div className="space-y-2.5">
            {lp.details.map((d) => (
              <div key={d.label}>
                <div className="mb-1 flex justify-between text-xs text-fg-muted">
                  <span>{d.label}</span>
                  <span className="font-mono">
                    {d.current} / {d.target}
                  </span>
                </div>
                <ProgressBar value={(d.current / d.target) * 100} height={6} color={d.current >= d.target ? "var(--color-success)" : undefined} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Derniers exercices */}
      <Card>
        <SectionTitle
          action={
            <Link href="/history" className="text-xs text-fg-muted underline-offset-2 hover:underline">
              Historique →
            </Link>
          }
        >
          Derniers exercices
        </SectionTitle>
        {recentExercises.length === 0 ? (
          <p className="text-sm text-fg-muted">Aucun exercice réalisé pour l&apos;instant. Ta première séance t&apos;attend.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recentExercises.map((e, i) => {
              const ex = getExercise(e.exerciseId);
              return (
                <li key={i} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/exercises/${e.exerciseId}`} className="truncate hover:text-accent-strong">
                    {ex?.name}
                  </Link>
                  <span className="shrink-0 text-xs text-fg-subtle">
                    {e.feedback ? FEEDBACK_LABELS[e.feedback].emoji : ""} {formatDayKey(e.date, { day: "numeric", month: "short" })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <p className="text-center text-[11px] text-fg-subtle">
        Cette application est un outil d&apos;entraînement, pas un diagnostic. Arrête en cas de douleur ou de fatigue vocale.
      </p>
    </div>
  );
}
