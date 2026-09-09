"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { LevelMeter, MicLimits, MicNotice, WidgetFrame, usePitch } from "./common";
import { freqToMidi, midiToName } from "@/lib/audio/notes";
import { cn } from "@/lib/utils";

/** Accordeur vocal : note la plus proche et écart approximatif en cents. */
export function Tuner() {
  const [on, setOn] = useState(false);
  const { frame, status } = usePitch(on);
  const valid = frame?.frequency && frame.clarity > 0.85 && frame.level > 0.03;
  const midiFloat = valid ? freqToMidi(frame!.frequency!) : null;
  const midi = midiFloat !== null ? Math.round(midiFloat) : null;
  const cents = midiFloat !== null && midi !== null ? Math.round((midiFloat - midi) * 100) : 0;

  return (
    <WidgetFrame
      title="Accordeur vocal"
      right={
        <Button size="sm" variant={on ? "secondary" : "primary"} onClick={() => setOn((v) => !v)} aria-pressed={on}>
          {on ? "■ Arrêter" : "🎙️ Activer le micro"}
        </Button>
      }
    >
      <MicNotice status={status} />
      <div className="flex flex-col items-center gap-4 py-4">
        <div className={cn("font-mono text-6xl font-semibold tabular-nums transition-colors", valid ? (Math.abs(cents) <= 10 ? "text-success" : "text-accent-strong") : "text-fg-subtle")}>
          {midi !== null ? midiToName(midi) : "—"}
        </div>
        <div className="text-sm text-fg-muted">{valid ? `${frame!.frequency!.toFixed(1)} Hz · ${cents > 0 ? "+" : ""}${cents} cents` : on ? "Chante une note tenue…" : "Micro inactif"}</div>
        <div className="relative h-3 w-full max-w-sm overflow-hidden rounded-full bg-surface-3">
          <div className="absolute inset-y-0 left-1/2 w-px bg-success" />
          <div className={cn("absolute top-0 h-full w-2 rounded-full transition-[left] duration-75", valid ? "bg-accent" : "bg-transparent")} style={{ left: `calc(50% + ${cents}% - 4px)` }} />
        </div>
        <div className="flex w-full max-w-sm justify-between text-[11px] text-fg-subtle">
          <span>−50</span>
          <span>0</span>
          <span>+50</span>
        </div>
        {frame && <div className="w-full max-w-sm"><LevelMeter level={frame.level} /></div>}
        <MicLimits />
      </div>
    </WidgetFrame>
  );
}
