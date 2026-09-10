"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui";
import { LevelMeter, MicLimits, MicNotice, WidgetFrame, foldCents, usePitch, useRange } from "./common";
import { getAudioEngine } from "@/lib/audio/engine";
import { centsOff, freqToMidi, midiToName } from "@/lib/audio/notes";
import { useAppStore } from "@/lib/store";
import { MIN_FRAME_CLARITY, MIN_FRAME_LEVEL, observationFrom, summarizeFrames } from "@/lib/vocal/capture";
import { cn } from "@/lib/utils";

type Verdict = "low" | "ok" | "high" | null;

function verdictOf(cents: number): Verdict {
  if (Math.abs(cents) <= 25) return "ok";
  return cents < 0 ? "low" : "high";
}

/**
 * Trames valides avant de conclure : un peu moins d'une seconde de son tenu.
 * C'est aussi la durée minimale pour que la tentative compte comme une mesure
 * de justesse, et pas seulement comme un repère à l'écran.
 */
const NEEDED_SAMPLES = 40;

/** Exercice « Trouve la note » : l'application joue une note, l'utilisateur la reproduit, le micro donne un repère. */
export function PitchMatch({ range = "mid", onResult }: { range?: "low" | "mid" | "full"; onResult?: (ok: boolean) => void }) {
  const { low, high } = useRange();
  const [target, setTarget] = useState<number | null>(null);
  const [micOn, setMicOn] = useState(false);
  const [live, setLive] = useState<{ cents: number; verdict: Verdict } | null>(null);
  const [result, setResult] = useState<Verdict>(null);
  const [stats, setStats] = useState({ ok: 0, total: 0 });
  const targetRef = useRef<number | null>(null);
  const samples = useRef<number[]>([]);
  const listening = useRef(false);
  const lastLiveUpdate = useRef(0);
  const midis = useRef<number[]>([]);
  const clarities = useRef<number[]>([]);
  const firstAt = useRef(0);
  const lastAt = useRef(0);
  const addObservations = useAppStore((s) => s.addObservations);

  const { frame, status } = usePitch(micOn, (f) => {
    const t = targetRef.current;
    if (t === null || !f.frequency || f.clarity < MIN_FRAME_CLARITY || f.level < MIN_FRAME_LEVEL) return;
    const cents = foldCents(centsOff(f.frequency, t));
    if (f.time - lastLiveUpdate.current > 50) {
      lastLiveUpdate.current = f.time;
      setLive({ cents, verdict: verdictOf(cents) });
    }
    if (!listening.current) return;
    if (samples.current.length === 0) firstAt.current = f.time;
    lastAt.current = f.time;
    samples.current.push(cents);
    midis.current.push(freqToMidi(f.frequency));
    clarities.current.push(f.clarity);
    if (samples.current.length >= NEEDED_SAMPLES) {
      const sorted = [...samples.current].sort((a, b) => a - b);
      const med = sorted[Math.floor(sorted.length / 2)];
      const v = verdictOf(med);
      listening.current = false;
      setResult(v);
      setStats((s) => ({ ok: s.ok + (v === "ok" ? 1 : 0), total: s.total + 1 }));
      onResult?.(v === "ok");
      // La tentative devient une observation : c'est elle qui fait évoluer la
      // justesse mesurée, dans un sens comme dans l'autre.
      const capture = summarizeFrames(midis.current, clarities.current, (lastAt.current - firstAt.current) / 1000, NEEDED_SAMPLES);
      if (capture) addObservations([observationFrom(t, capture, "pitch-test")]);
    }
  });

  const pickTarget = () => {
    let lo = low;
    let hi = high;
    if (range === "mid") {
      const c = (low + high) / 2;
      lo = Math.round(c - 4);
      hi = Math.round(c + 4);
    } else if (range === "low") {
      hi = Math.round((low + high) / 2);
    }
    let m = lo + Math.floor(Math.random() * (hi - lo + 1));
    if (m === target && hi > lo) m = m === hi ? m - 1 : m + 1;
    return m;
  };

  const playTarget = (m: number) => {
    getAudioEngine().play(m, 1.2, "piano");
  };

  const next = () => {
    const m = pickTarget();
    targetRef.current = m;
    setTarget(m);
    setResult(null);
    setLive(null);
    samples.current = [];
    midis.current = [];
    clarities.current = [];
    listening.current = false;
    playTarget(m);
    window.setTimeout(() => {
      listening.current = true;
    }, 1300);
  };

  const needle = live ? Math.max(-100, Math.min(100, live.cents)) : 0;

  return (
    <WidgetFrame
      title="Trouve la note"
      right={
        <Button size="sm" variant={micOn ? "secondary" : "primary"} onClick={() => setMicOn((v) => !v)} aria-pressed={micOn}>
          {micOn ? "🎙️ Micro actif" : "🎙️ Activer le micro"}
        </Button>
      }
    >
      <MicNotice status={status} />
      <div className="mt-2 flex flex-col items-center gap-4">
        <div className="text-center">
          <div className="text-[11px] uppercase tracking-[0.14em] text-fg-subtle">Note cible</div>
          <div className="font-mono text-4xl font-semibold tabular-nums">{target !== null ? midiToName(target) : "—"}</div>
        </div>

        <div className="w-full">
          <div className="relative h-10 w-full overflow-hidden rounded-xl bg-surface-3">
            <div className="absolute inset-y-0 left-1/2 w-[25%] -translate-x-1/2 bg-success/20" />
            <div className="absolute inset-y-0 left-1/2 w-px bg-success" />
            <div
              className={cn("absolute top-1 bottom-1 w-1.5 rounded-full transition-[left] duration-75", live ? (live.verdict === "ok" ? "bg-success" : "bg-accent") : "bg-fg-subtle/40")}
              style={{ left: `calc(50% + ${needle / 2}% - 3px)` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-fg-subtle">
            <span>Trop bas</span>
            <span>Correct</span>
            <span>Trop haut</span>
          </div>
          {frame && (
            <div className="mt-2">
              <LevelMeter level={frame.level} />
            </div>
          )}
        </div>

        <div className="h-8 text-center text-sm">
          {result === "ok" && <span className="font-semibold text-success">✓ Correct</span>}
          {result === "low" && <span className="font-semibold text-accent-strong">↓ Trop bas : pense la note plus lumineuse</span>}
          {result === "high" && <span className="font-semibold text-accent-strong">↑ Trop haut : détends la mâchoire</span>}
          {result === null && target !== null && micOn && <span className="text-fg-muted">Chante la note et tiens-la…</span>}
          {result === null && target !== null && !micOn && <span className="text-fg-muted">Chante la note. Active le micro pour un repère.</span>}
        </div>

        <div className="flex w-full gap-2">
          <Button variant="secondary" full onClick={() => target !== null && playTarget(target)} disabled={target === null}>
            🔁 Réécouter
          </Button>
          <Button full onClick={next}>
            {target === null ? "▶ Jouer une note" : "Note suivante →"}
          </Button>
        </div>
        <div className="text-xs text-fg-subtle">
          Réussites : {stats.ok} / {stats.total}
        </div>
        <MicLimits />
      </div>
    </WidgetFrame>
  );
}
