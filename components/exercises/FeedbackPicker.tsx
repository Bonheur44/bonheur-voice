"use client";

import { FEEDBACK_LABELS } from "@/lib/skills";
import type { Feedback } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FeedbackPicker({ value, onChange }: { value: Feedback | null; onChange: (f: Feedback) => void }) {
  return (
    <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Ressenti">
      {([1, 2, 3, 4, 5] as Feedback[]).map((f) => (
        <button
          key={f}
          role="radio"
          aria-checked={value === f}
          onClick={() => onChange(f)}
          className={cn(
            "flex flex-col items-center gap-1 rounded-xl border px-1 py-3 transition-all",
            value === f ? "border-accent bg-accent-soft scale-[1.03]" : "border-border bg-surface hover:border-border-strong",
          )}
        >
          <span className="text-2xl">{FEEDBACK_LABELS[f].emoji}</span>
          <span className="text-[10px] font-medium text-fg-muted leading-tight text-center">{FEEDBACK_LABELS[f].label}</span>
        </button>
      ))}
    </div>
  );
}
