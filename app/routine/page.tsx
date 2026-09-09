"use client";

import { useEffect } from "react";
import { DURATION_OPTIONS, SessionPlan } from "@/components/routine/SessionPlan";
import { Button, Callout, Card, Eyebrow, LinkButton, SectionTitle, Segmented, Spinner } from "@/components/ui";
import { getExercise } from "@/data/exercises";
import { LEVELS, SKILLS } from "@/lib/skills";
import { useAppStore } from "@/lib/store";
import { useHydrated, useLevel } from "@/lib/store/hooks";
import type { SkillId } from "@/lib/types";
import { formatDuration, toDayKey } from "@/lib/utils";

export default function RoutinePage() {
  const hydrated = useHydrated();
  const profile = useAppStore((s) => s.profile);
  const current = useAppStore((s) => s.currentSession);
  const ensure = useAppStore((s) => s.ensureTodaySession);
  const regenerate = useAppStore((s) => s.regenerateSession);
  const abandon = useAppStore((s) => s.abandonSession);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const level = useLevel();

  useEffect(() => {
    if (hydrated) ensure();
  }, [hydrated, ensure]);

  if (!hydrated) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner />
      </div>
    );
  }

  const session = current && current.date === toDayKey() ? current : null;
  const started = !!session?.startedAt;
  const duration = started ? session!.plannedDuration : profile.preferredDuration;

  const changeDuration = (d: number) => {
    updateProfile({ preferredDuration: d });
    if (started) return; // une séance démarrée conserve son plan
    ensure(d);
  };

  const summary = session
    ? session.exercises.reduce<Record<string, number>>((acc, e) => {
        const ex = getExercise(e.exerciseId);
        if (!ex) return acc;
        const key = ex.cooldown ? "cooldown" : ex.category;
        acc[key] = (acc[key] ?? 0) + e.plannedDuration;
        return acc;
      }, {})
    : {};

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Niveau {level} · {LEVELS[level].name}</Eyebrow>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Séance du jour</h1>
        <p className="mt-1 text-sm text-fg-muted">Respiration → échauffement → travail ciblé → retour au calme. La séance s&apos;adapte à ton niveau et à tes retours.</p>
      </div>

      <Card>
        <SectionTitle>Temps disponible</SectionTitle>
        <div className="-mx-1 overflow-x-auto px-1 scrollbar-none">
          <Segmented options={DURATION_OPTIONS} value={duration} onChange={changeDuration} />
        </div>
        {started && <p className="mt-2 text-xs text-fg-subtle">Une séance est en cours : la durée choisie s&apos;appliquera à la prochaine séance.</p>}
      </Card>

      {session ? (
        <>
          <Card>
            <SectionTitle action={<span className="font-mono text-xs text-fg-muted">{formatDuration(session.exercises.reduce((a, e) => a + e.plannedDuration, 0))}</span>}>
              Programme · {session.exercises.length} exercices
            </SectionTitle>
            <SessionPlan session={session} />
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(summary).map(([k, v]) => {
                const meta = k === "cooldown" ? { label: "Retour au calme", color: "#94a3b8" } : SKILLS[k as SkillId];
                return (
                  <span key={k} className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ backgroundColor: `${meta.color}22`, color: meta.color }}>
                    {meta.label} · {Math.round(v / 60)} min
                  </span>
                );
              })}
            </div>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row">
            <LinkButton href="/routine/play" size="xl" full>
              {started ? "▶ Reprendre" : "▶ Commencer la séance"}
            </LinkButton>
            {!started ? (
              <Button variant="secondary" size="xl" onClick={() => regenerate(duration)}>
                🎲 Autre variante
              </Button>
            ) : (
              <Button
                variant="danger"
                size="xl"
                onClick={() => {
                  abandon();
                  ensure(profile.preferredDuration);
                }}
              >
                Abandonner
              </Button>
            )}
          </div>
        </>
      ) : (
        <Callout tone="info">Génération de la séance…</Callout>
      )}

      <Callout tone="warning" title="Avant de commencer">
        Bois un peu d&apos;eau. Chante à volume doux ou moyen. Si quelque chose tire, gratte ou fait mal : arrête l&apos;exercice, passe au suivant ou termine la séance.
      </Callout>
    </div>
  );
}
