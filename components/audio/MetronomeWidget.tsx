"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Slider } from "@/components/ui";
import { WidgetFrame } from "./common";
import { Metronome } from "@/lib/audio/metronome";
import { cn } from "@/lib/utils";

export function MetronomeWidget({ bpm: initialBpm = 80, beatsPerBar = 4, autoStart = false, compact = false }: { bpm?: number; beatsPerBar?: number; autoStart?: boolean; compact?: boolean }) {
  const [bpm, setBpm] = useState(initialBpm);
  const [running, setRunning] = useState(autoStart);
  const [beat, setBeat] = useState(-1);
  const metroRef = useRef<Metronome | null>(null);
  const bpmRef = useRef(bpm);

  useEffect(() => {
    const m = new Metronome(bpmRef.current, beatsPerBar);
    m.onBeat = (b) => setBeat(b);
    metroRef.current = m;
    if (autoStart) m.start();
    return () => m.stop();
  }, [beatsPerBar, autoStart]);

  useEffect(() => {
    bpmRef.current = bpm;
    if (metroRef.current) metroRef.current.bpm = bpm;
  }, [bpm]);

  const toggle = () => {
    const m = metroRef.current;
    if (!m) return;
    if (running) {
      m.stop();
      setRunning(false);
      setBeat(-1);
    } else {
      m.start();
      setRunning(true);
    }
  };

  return (
    <WidgetFrame
      title="Métronome"
      right={
        <Button size="sm" variant={running ? "secondary" : "primary"} onClick={toggle} aria-pressed={running}>
          {running ? "■ Stop" : "▶ Lancer"}
        </Button>
      }
    >
      <div className="flex items-center justify-center gap-3 py-2">
        {Array.from({ length: beatsPerBar }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-full transition-all duration-75",
              compact ? "h-4 w-4" : "h-6 w-6",
              beat === i ? (i === 0 ? "scale-125 bg-accent shadow-glow" : "scale-110 bg-fg") : "bg-surface-3",
            )}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <Button size="sm" variant="secondary" onClick={() => setBpm((b) => Math.max(40, b - 4))} aria-label="Ralentir">−</Button>
        <div className="flex-1">
          <Slider label="Tempo" value={bpm} min={40} max={160} onChange={setBpm} format={(v) => `${v} bpm`} />
        </div>
        <Button size="sm" variant="secondary" onClick={() => setBpm((b) => Math.min(160, b + 4))} aria-label="Accélérer">+</Button>
      </div>
    </WidgetFrame>
  );
}
