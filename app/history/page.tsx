"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Card, EmptyState, Eyebrow, Spinner } from "@/components/ui";
import { getExercise } from "@/data/exercises";
import { completedSessions } from "@/lib/progression";
import { FEEDBACK_LABELS, LEVELS, SKILLS } from "@/lib/skills";
import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/store/hooks";
import { formatDayKey, formatDuration } from "@/lib/utils";

export default function HistoryPage() {
  const hydrated = useHydrated();
  const sessions = useAppStore((s) => s.sessions);
  const [open, setOpen] = useState<string | null>(null);

  if (!hydrated) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner />
      </div>
    );
  }

  const done = [...completedSessions(sessions)].reverse();

  return (
    <div className="space-y-5">
      <div>
        <Link href="/progression" className="text-sm text-fg-muted hover:text-fg">
          ← Progression
        </Link>
        <Eyebrow className="mt-3">Historique</Eyebrow>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Mes séances</h1>
      </div>

      {done.length === 0 ? (
        <EmptyState emoji="📅" title="Aucune séance terminée">
          Ta première séance apparaîtra ici avec le détail de chaque exercice et ton ressenti.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {done.map((s) => {
            const isOpen = open === s.id;
            const completed = s.exercises.filter((e) => e.completed).length;
            return (
              <li key={s.id}>
                <Card className="p-0 overflow-hidden">
                  <button onClick={() => setOpen(isOpen ? null : s.id)} className="flex w-full items-center justify-between gap-3 p-4 text-left" aria-expanded={isOpen}>
                    <div>
                      <div className="font-medium capitalize">{formatDayKey(s.date)}</div>
                      <div className="mt-0.5 text-xs text-fg-subtle">
                        {formatDuration(s.totalDuration)} · {completed}/{s.exercises.length} exercices · niveau {s.level} {LEVELS[s.level].name}
                      </div>
                    </div>
                    <span className="text-fg-subtle">{isOpen ? "▴" : "▾"}</span>
                  </button>
                  {isOpen && (
                    <ul className="divide-y divide-border border-t border-border">
                      {s.exercises.map((e, i) => {
                        const ex = getExercise(e.exerciseId);
                        if (!ex) return null;
                        return (
                          <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                            <Badge color={SKILLS[ex.category].color}>{SKILLS[ex.category].shortLabel}</Badge>
                            <Link href={`/exercises/${ex.id}`} className={`min-w-0 flex-1 truncate ${e.skipped ? "text-fg-subtle line-through" : ""}`}>
                              {ex.name}
                            </Link>
                            <span className="shrink-0 font-mono text-xs text-fg-subtle">{formatDuration(e.actualDuration ?? 0)}</span>
                            <span className="shrink-0 text-base" title={e.feedback ? FEEDBACK_LABELS[e.feedback].label : undefined}>
                              {e.feedback ? FEEDBACK_LABELS[e.feedback].emoji : e.skipped ? "–" : ""}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
