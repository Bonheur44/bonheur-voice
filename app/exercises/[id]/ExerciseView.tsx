"use client";

import Link from "next/link";
import { useState } from "react";
import { ExerciseBody, ExerciseHeader } from "@/components/exercises/ExerciseDetail";
import { InteractiveWidget } from "@/components/exercises/InteractiveWidget";
import { Button, Card, Eyebrow } from "@/components/ui";
import { getExercise } from "@/data/exercises";
import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/store/hooks";
import type { Exercise } from "@/lib/types";
import { FEEDBACK_LABELS } from "@/lib/skills";
import { formatDayKey } from "@/lib/utils";

export function ExerciseView({ exercise }: { exercise: Exercise }) {
  const hydrated = useHydrated();
  const sessions = useAppStore((s) => s.sessions);
  const [trying, setTrying] = useState(false);

  const history = hydrated
    ? sessions
        .flatMap((s) => s.exercises.filter((e) => e.exerciseId === exercise.id && e.completed).map((e) => ({ date: s.date, feedback: e.feedback })))
        .slice(-6)
        .reverse()
    : [];

  const prereqs = (exercise.prerequisites ?? []).map((id) => getExercise(id)).filter(Boolean) as Exercise[];

  return (
    <div className="space-y-6">
      <Link href="/exercises" className="text-sm text-fg-muted hover:text-fg">
        ← Exercices
      </Link>
      <ExerciseHeader exercise={exercise} />

      {exercise.interactive && (
        <Card glow={trying}>
          {trying ? (
            <InteractiveWidget spec={exercise.interactive} running />
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">Essai libre</div>
                <div className="text-sm text-fg-muted">Lance l&apos;outil interactif de cet exercice, hors séance.</div>
              </div>
              <Button onClick={() => setTrying(true)}>▶ Essayer</Button>
            </div>
          )}
        </Card>
      )}

      <ExerciseBody exercise={exercise} />

      {prereqs.length > 0 && (
        <Card>
          <Eyebrow className="mb-2">À maîtriser avant</Eyebrow>
          <ul className="space-y-1 text-sm">
            {prereqs.map((p) => (
              <li key={p.id}>
                <Link href={`/exercises/${p.id}`} className="text-accent-strong hover:underline">
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <Eyebrow className="mb-2">Ton historique sur cet exercice</Eyebrow>
        {history.length === 0 ? (
          <p className="text-sm text-fg-muted">Pas encore réalisé en séance.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {history.map((h, i) => (
              <li key={i} className="flex justify-between">
                <span className="text-fg-muted">{formatDayKey(h.date, { day: "numeric", month: "long" })}</span>
                <span>{h.feedback ? `${FEEDBACK_LABELS[h.feedback].emoji} ${FEEDBACK_LABELS[h.feedback].label}` : "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
