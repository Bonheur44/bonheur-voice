"use client";

import { ProgressBar } from "@/components/ui";
import { SKILLS, SKILL_ORDER } from "@/lib/skills";
import type { SkillId, SkillState } from "@/lib/types";

export function SkillBars({ skills, compact = false, only }: { skills: Record<SkillId, SkillState>; compact?: boolean; only?: SkillId[] }) {
  const ids = only ?? SKILL_ORDER;
  return (
    <div className={compact ? "space-y-2.5" : "space-y-3.5"}>
      {ids.map((id) => {
        const meta = SKILLS[id];
        const score = Math.round(skills[id].score);
        return (
          <div key={id}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span aria-hidden>{meta.emoji}</span>
                <span className="font-medium">{meta.label}</span>
              </span>
              <span className="font-mono text-fg-muted tabular-nums">{score}%</span>
            </div>
            <ProgressBar value={score} color={meta.color} height={compact ? 6 : 8} label={meta.label} />
          </div>
        );
      })}
    </div>
  );
}
