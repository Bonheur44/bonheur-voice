"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { WidgetFrame } from "./common";
import { getAudioEngine } from "@/lib/audio/engine";

type Phase = "inhale" | "hold" | "exhale" | "rest";
const LABELS: Record<Phase, string> = { inhale: "Inspire", hold: "Retiens", exhale: "Expire", rest: "Relâche" };

interface GuideState {
  phase: Phase;
  remaining: number;
  cycles: number;
  idx: number;
}

export function BreathingGuide({ inhale, hold, exhale, rest = 1, running }: { inhale: number; hold: number; exhale: number; rest?: number; running: boolean }) {
  const order: Array<[Phase, number]> = (
    [
      ["inhale", inhale],
      ["hold", hold],
      ["exhale", exhale],
      ["rest", rest],
    ] as Array<[Phase, number]>
  ).filter(([, d]) => d > 0);

  const initial = (): GuideState => ({ phase: order[0][0], remaining: order[0][1], cycles: 0, idx: 0 });
  const [state, setState] = useState<GuideState>(initial);
  const [sound, setSound] = useState(true);
  const soundRef = useRef(true);
  const orderRef = useRef(order);

  // Réinitialise quand on (re)démarre
  const [prevRunning, setPrevRunning] = useState(running);
  if (running !== prevRunning) {
    setPrevRunning(running);
    setState(initial());
  }

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);
  useEffect(() => {
    orderRef.current = order;
  });

  useEffect(() => {
    if (!running) return;
    const tick = window.setInterval(() => {
      setState((s) => {
        const ord = orderRef.current;
        if (s.remaining > 1) return { ...s, remaining: s.remaining - 1 };
        const idx = (s.idx + 1) % ord.length;
        const phase = ord[idx][0];
        if (soundRef.current) {
          try {
            getAudioEngine().play(phase === "inhale" ? 72 : phase === "exhale" ? 60 : 67, 0.15, "piano", undefined, 0.4);
          } catch {
            /* audio indisponible */
          }
        }
        return { phase, remaining: ord[idx][1], cycles: idx === 0 ? s.cycles + 1 : s.cycles, idx };
      });
    }, 1000);
    return () => window.clearInterval(tick);
  }, [running]);

  const { phase, remaining, cycles } = state;
  const total = phase === "inhale" ? inhale : phase === "hold" ? hold : phase === "exhale" ? exhale : rest;
  const progress = total > 0 ? 1 - remaining / total : 0;
  const scale = phase === "inhale" ? 0.55 + 0.45 * progress : phase === "exhale" ? 1 - 0.45 * progress : phase === "hold" ? 1 : 0.55;

  return (
    <WidgetFrame
      title="Guide respiratoire"
      right={
        <Button size="sm" variant="ghost" onClick={() => setSound((s) => !s)} aria-pressed={sound}>
          {sound ? "🔔 Sons" : "🔕 Muet"}
        </Button>
      }
    >
      <div className="flex flex-col items-center gap-4 py-2">
        <div className="relative grid h-48 w-48 place-items-center">
          <div className="absolute inset-0 rounded-full border border-border-strong" />
          <div
            className="absolute rounded-full bg-gradient-to-br from-sky-400/70 to-accent/60 blur-[1px]"
            style={{ width: "100%", height: "100%", transform: `scale(${scale})`, transition: running ? "transform 1s linear" : "none" }}
          />
          <div className="relative text-center">
            <div className="text-lg font-semibold">{running ? LABELS[phase] : "Prêt"}</div>
            <div className="font-mono text-4xl font-semibold tabular-nums">{running ? remaining : inhale}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-2 text-xs text-fg-muted">
          <span>Inspire {inhale}s</span>
          {hold > 0 && <span>· Retiens {hold}s</span>}
          <span>· Expire {exhale}s</span>
          <span className="text-fg-subtle">· {cycles} cycle{cycles > 1 ? "s" : ""}</span>
        </div>
      </div>
    </WidgetFrame>
  );
}
