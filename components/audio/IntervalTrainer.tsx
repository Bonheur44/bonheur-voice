"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { WidgetFrame, useRange } from "./common";
import { getAudioEngine } from "@/lib/audio/engine";
import { INTERVALS } from "@/lib/audio/notes";
import { cn } from "@/lib/utils";

export function IntervalTrainer({ intervals }: { intervals: number[] }) {
  const { low, high } = useRange();
  const [current, setCurrent] = useState<{ base: number; interval: number; up: boolean } | null>(null);
  const [answer, setAnswer] = useState<number | null>(null);
  const [stats, setStats] = useState({ ok: 0, total: 0 });

  const play = (q: { base: number; interval: number; up: boolean }) => {
    const eng = getAudioEngine();
    const t = eng.now + 0.05;
    const second = q.up ? q.base + q.interval : q.base - q.interval;
    eng.play(q.base, 0.8, "piano", t);
    eng.play(second, 1.0, "piano", t + 0.9);
  };

  const next = () => {
    const interval = intervals[Math.floor(Math.random() * intervals.length)];
    const up = Math.random() > 0.35;
    const lo = up ? low : low + interval;
    const hi = up ? high - interval : high;
    const base = lo + Math.floor(Math.random() * Math.max(1, hi - lo + 1));
    const q = { base, interval, up };
    setCurrent(q);
    setAnswer(null);
    play(q);
  };

  const choose = (i: number) => {
    if (!current || answer !== null) return;
    setAnswer(i);
    setStats((s) => ({ ok: s.ok + (i === current.interval ? 1 : 0), total: s.total + 1 }));
  };

  return (
    <WidgetFrame title="Intervalles">
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Button variant="secondary" full onClick={() => current && play(current)} disabled={!current}>
            🔁 Réécouter
          </Button>
          <Button full onClick={next}>
            {current ? "Suivant →" : "▶ Écouter"}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {intervals.map((i) => {
            const state = answer === null ? "idle" : i === current?.interval ? "correct" : i === answer ? "wrong" : "idle";
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={!current || answer !== null}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-70",
                  state === "correct" && "border-success bg-success/15 text-success",
                  state === "wrong" && "border-danger bg-danger/15 text-danger",
                  state === "idle" && "border-border-strong bg-surface hover:border-accent",
                )}
              >
                <div>{INTERVALS[i].name}</div>
                <div className="text-[10px] text-fg-subtle">{INTERVALS[i].short}</div>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-xs text-fg-subtle">
          <span>
            {answer !== null && current && (answer === current.interval ? "✓ Bien entendu. Chante-le sur « ou »." : `✗ C'était : ${INTERVALS[current.interval].name} (${current.up ? "montante" : "descendante"}).`)}
          </span>
          <span>
            {stats.ok} / {stats.total}
          </span>
        </div>
      </div>
    </WidgetFrame>
  );
}
