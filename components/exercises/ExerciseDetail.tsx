"use client";

import { Badge, Callout, Eyebrow } from "@/components/ui";
import { SKILLS } from "@/lib/skills";
import type { Exercise } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

export function ExerciseHeader({ exercise, plannedDuration }: { exercise: Exercise; plannedDuration?: number }) {
  const meta = SKILLS[exercise.category];
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge color={meta.color}>
          {meta.emoji} {exercise.cooldown ? "Retour au calme" : meta.label}
        </Badge>
        <Badge>Niveau {exercise.level}</Badge>
        <Badge>Difficulté {"●".repeat(exercise.difficulty)}{"○".repeat(5 - exercise.difficulty)}</Badge>
      </div>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{exercise.name}</h1>
      <p className="mt-2 text-fg-muted leading-relaxed">{exercise.objective}</p>
      <div className="mt-3 flex flex-wrap gap-4 text-sm text-fg-muted">
        <span>⏱ {formatDuration(plannedDuration ?? exercise.duration)}</span>
        {exercise.repetitions && <span>🔁 {exercise.repetitions} répétitions</span>}
      </div>
    </div>
  );
}

export function ExerciseBody({ exercise }: { exercise: Exercise }) {
  return (
    <div className="space-y-5">
      <Callout tone="info" title="Pourquoi cet exercice">
        {exercise.why}
      </Callout>

      <section>
        <Eyebrow className="mb-2">Comment faire</Eyebrow>
        <ol className="space-y-2">
          {exercise.instructions.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-4">
          <Eyebrow className="mb-2">Ce que tu dois sentir</Eyebrow>
          <ul className="space-y-1.5 text-sm text-fg-muted">
            {exercise.focusPoints.map((p, i) => (
              <li key={i} className="flex gap-2"><span className="text-success">✓</span><span>{p}</span></li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-border bg-surface p-4">
          <Eyebrow className="mb-2">Erreurs fréquentes</Eyebrow>
          <ul className="space-y-1.5 text-sm text-fg-muted">
            {exercise.commonMistakes.map((p, i) => (
              <li key={i} className="flex gap-2"><span className="text-danger">✗</span><span>{p}</span></li>
            ))}
          </ul>
        </section>
      </div>

      {exercise.safetyNotes.length > 0 && (
        <Callout tone="warning" title="Sécurité vocale">
          <ul className="space-y-1">
            {exercise.safetyNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </Callout>
      )}
    </div>
  );
}
