"use client";

import Link from "next/link";
import { useState } from "react";
import { ChoirMode } from "@/components/audio/ChoirMode";
import { MelodyLearner } from "@/components/audio/MelodyLearner";
import { MetronomeWidget } from "@/components/audio/MetronomeWidget";
import { Piano } from "@/components/audio/Piano";
import { ScalePlayer } from "@/components/audio/ScalePlayer";
import { CompactSoundSelect } from "@/components/audio/SoundPicker";
import { Tuner } from "@/components/audio/Tuner";
import { useRange } from "@/components/audio/common";
import { Callout, Card, Eyebrow } from "@/components/ui";
import { MELODIES } from "@/data/music/melodies";
import { midiToName } from "@/lib/audio/notes";
import { useHydrated } from "@/lib/store/hooks";
import type { ToolId } from "../tools";

export function ToolView({ tool, name, description, emoji }: { tool: ToolId; name: string; description: string; emoji: string }) {
  const hydrated = useHydrated();
  const { low, high } = useRange();
  const [melodyId, setMelodyId] = useState("tenor-line-full");

  return (
    <div className="space-y-5">
      <Link href="/tools" className="text-sm text-fg-muted hover:text-fg">
        ← Outils
      </Link>
      <div>
        <Eyebrow>{emoji} Outil</Eyebrow>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{name}</h1>
        <p className="mt-1 text-sm text-fg-muted">{description}</p>
      </div>

      {hydrated && (
        <>
          {tool === "piano" && (
            <Card>
              <div className="mb-3 flex justify-end">
                <CompactSoundSelect kind="instrument" />
              </div>
              <Piano from={Math.max(36, low - 7)} to={Math.min(84, high + 7)} lowMark={low} highMark={high} />
              <p className="mt-3 text-xs text-fg-subtle">
                Touches claires : ta zone confortable ({midiToName(low)} → {midiToName(high)}). Modifiable dans les réglages.
              </p>
            </Card>
          )}
          {tool === "tuner" && <Tuner />}
          {tool === "metronome" && <MetronomeWidget bpm={80} />}
          {tool === "scales" && (
            <>
              <ScalePlayer pattern="scale5" bpm={100} allowPatternChange />
              <Callout tone="info" title="Comment l&apos;utiliser">
                Choisis un pattern, une note de départ, puis chante avec le piano sur « nou », « mi » ou « a ». L&apos;outil monte d&apos;un demi-ton à chaque répétition et s&apos;arrête à ta note haute confortable : ne modifie pas ta zone pour « monter plus haut ».
              </Callout>
            </>
          )}
          {tool === "choir" && <ChoirMode />}
          {tool === "melody" && (
            <>
              <select value={melodyId} onChange={(e) => setMelodyId(e.target.value)} aria-label="Choisir une mélodie" className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-accent">{MELODIES.filter((m) => m.mode === "song").map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}</select>
              <MelodyLearner key={melodyId} melodyId={melodyId} />
            </>
          )}
        </>
      )}
    </div>
  );
}
