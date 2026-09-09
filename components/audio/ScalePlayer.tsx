"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Slider } from "@/components/ui";
import { WidgetFrame, useRange } from "./common";
import { getAudioEngine, playTimeline } from "@/lib/audio/engine";
import { SCALE_PATTERNS, midiToName } from "@/lib/audio/notes";
import type { ScalePatternId } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Joue un pattern (gamme, arpège, sirène) en montant d'un demi-ton à chaque répétition,
 * sans jamais dépasser la note haute confortable.
 */
export function ScalePlayer({ pattern, bpm: initialBpm = 90, startOffset = 0, allowPatternChange = false }: { pattern: ScalePatternId; bpm?: number; startOffset?: number; allowPatternChange?: boolean }) {
  const { low, high } = useRange();
  const [pat, setPat] = useState<ScalePatternId>(pattern);
  const [bpm, setBpm] = useState(initialBpm);
  const [rawStart, setStart] = useState(low + startOffset);
  const [playing, setPlaying] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [autoRise, setAutoRise] = useState(true);
  const stopRef = useRef<() => void>(() => {});
  const timerRef = useRef(0);

  const steps = SCALE_PATTERNS[pat].steps;
  const span = Math.max(...steps);
  const maxStart = Math.max(low, high - span);
  const start = Math.min(Math.max(low, rawStart), maxStart);

  useEffect(() => () => { stopRef.current(); window.clearTimeout(timerRef.current); }, []);

  const stop = () => {
    stopRef.current();
    window.clearTimeout(timerRef.current);
    setPlaying(false);
    setActiveIdx(-1);
  };

  const playOnce = (from: number, onDone: () => void) => {
    const eng = getAudioEngine();
    if (pat === "siren") {
      const dur = (60 / bpm) * 4;
      const n1 = eng.glide(from, from + 12, dur / 2, "drone");
      const n2 = eng.glide(from + 12, from, dur / 2, "drone", eng.now + dur / 2);
      setActiveIdx(0);
      stopRef.current = () => { n1.stop(); n2.stop(); };
      timerRef.current = window.setTimeout(onDone, dur * 1000 + 300);
      return;
    }
    const beat = 60 / bpm;
    const events = steps.map((s, i) => ({ midi: from + s, start: i * beat, duration: i === steps.length - 1 ? beat * 1.6 : beat }));
    const h = playTimeline(events, "piano", 1, (i) => setActiveIdx(i));
    stopRef.current = h.stop;
    timerRef.current = window.setTimeout(onDone, h.totalDuration * 1000 + 400);
  };

  const run = (from: number) => {
    setPlaying(true);
    setStart(from);
    playOnce(from, () => {
      const nextStart = from + 1;
      if (autoRise && nextStart <= maxStart) {
        timerRef.current = window.setTimeout(() => run(nextStart), 600);
      } else {
        setPlaying(false);
        setActiveIdx(-1);
      }
    });
  };

  return (
    <WidgetFrame
      title={SCALE_PATTERNS[pat].label}
      right={
        <Button size="sm" variant={playing ? "secondary" : "primary"} onClick={() => (playing ? stop() : run(start))}>
          {playing ? "■ Stop" : "▶ Jouer"}
        </Button>
      }
    >
      {allowPatternChange && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(Object.keys(SCALE_PATTERNS) as ScalePatternId[]).map((p) => (
            <button key={p} onClick={() => { stop(); setPat(p); }} className={cn("rounded-full border px-3 py-1 text-xs font-medium", p === pat ? "border-accent bg-accent-soft text-accent-strong" : "border-border-strong text-fg-muted")}>
              {SCALE_PATTERNS[p].label}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <Button size="sm" variant="secondary" onClick={() => setStart((s) => Math.max(low, s - 1))} disabled={playing || start <= low} aria-label="Plus bas">↓</Button>
        <div className="text-center">
          <div className="text-[11px] uppercase tracking-[0.14em] text-fg-subtle">Départ</div>
          <div className="font-mono text-2xl font-semibold tabular-nums">{midiToName(start)}</div>
          <div className="text-[11px] text-fg-subtle">sommet {midiToName(start + span)} · max {midiToName(high)}</div>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setStart((s) => Math.min(maxStart, s + 1))} disabled={playing || start >= maxStart} aria-label="Plus haut">↑</Button>
      </div>

      <div className="mt-3 flex items-end justify-center gap-1 h-16">
        {pat === "siren" ? (
          <div className={cn("text-sm text-fg-muted", playing && "text-accent-strong animate-pulse-soft")}>{SCALE_PATTERNS[pat].description}</div>
        ) : (
          steps.map((s, i) => (
            <div key={i} className={cn("w-3 rounded-t transition-colors", i === activeIdx ? "bg-accent" : "bg-surface-3")} style={{ height: `${20 + (s / (span || 1)) * 80}%` }} />
          ))
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <Slider label="Tempo" value={bpm} min={30} max={140} onChange={setBpm} format={(v) => `${v} bpm`} />
        <label className="flex items-center gap-2 text-xs text-fg-muted">
          <input type="checkbox" checked={autoRise} onChange={(e) => setAutoRise(e.target.checked)} className="accent-amber-500" />
          Monter d&apos;un demi-ton
        </label>
      </div>
    </WidgetFrame>
  );
}
