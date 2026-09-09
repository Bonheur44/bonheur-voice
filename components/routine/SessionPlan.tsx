"use client";

import Link from "next/link";
import { Badge } from "@/components/ui";
import { getExercise } from "@/data/exercises";
import { SKILLS } from "@/lib/skills";
import type { Session } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";

export function SessionPlan({ session, compact = false, currentIndex }: { session: Session; compact?: boolean; currentIndex?: number }) {
  return (
    <ol className={cn("space-y-2", compact && "space-y-1.5")}>
      {session.exercises.map((se, i) => {
        const ex = getExercise(se.exerciseId);
        if (!ex) return null;
        const meta = SKILLS[ex.category];
        const isCurrent = currentIndex === i;
        return (
          <li key={`${se.exerciseId}-${i}`}>
            <Link
              href={`/exercises/${ex.id}`}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                isCurrent ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-border-strong",
                se.completed && "opacity-70",
              )}
            >
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-semibold" style={{ backgroundColor: `${meta.color}22`, color: meta.color }}>
                {se.completed ? "✓" : se.skipped ? "–" : i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{ex.name}</div>
                {!compact && (
                  <div className="flex items-center gap-2 text-[11px] text-fg-subtle">
                    <span>{ex.cooldown ? "Retour au calme" : meta.label}</span>
                    <span>·</span>
                    <span>difficulté {ex.difficulty}/5</span>
                    {se.feedback && <Badge className="ml-1">{["", "😣", "😕", "🙂", "😄", "🔥"][se.feedback]}</Badge>}
                  </div>
                )}
              </div>
              <div className="shrink-0 font-mono text-xs text-fg-muted tabular-nums">{formatDuration(se.plannedDuration)}</div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

export const DURATION_OPTIONS = [10, 15, 20, 30, 45].map((m) => ({ value: m * 60, label: `${m} min` }));
