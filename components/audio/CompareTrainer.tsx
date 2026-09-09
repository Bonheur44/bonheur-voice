"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { WidgetFrame, useRange } from "./common";
import { getAudioEngine } from "@/lib/audio/engine";
import { midiToFreq } from "@/lib/audio/notes";
import { cn } from "@/lib/utils";

type Choice = "higher" | "lower" | "same";

/** « Trop haut ou trop bas ? » : compare deux notes avec un écart adaptatif en cents. */
export function CompareTrainer() {
  const { low, high } = useRange();
  const [cents, setCents] = useState(100);
  const [q, setQ] = useState<{ base: number; delta: number } | null>(null);
  const [answer, setAnswer] = useState<Choice | null>(null);
  const [stats, setStats] = useState({ ok: 0, total: 0 });

  const play = (question: { base: number; delta: number }) => {
    const eng = getAudioEngine();
    const t = eng.now + 0.05;
    eng.play(question.base, 0.8, "piano", t);
    const n = eng.start(question.base, "piano", t + 0.95);
    n.setFrequency(midiToFreq(question.base) * Math.pow(2, question.delta / 1200), t + 0.95);
    n.stop(t + 1.9);
  };

  const next = () => {
    const base = low + Math.floor(Math.random() * (high - low + 1));
    const r = Math.random();
    const delta = r < 0.4 ? cents : r < 0.8 ? -cents : 0;
    const question = { base, delta };
    setQ(question);
    setAnswer(null);
    play(question);
  };

  const choose = (c: Choice) => {
    if (!q || answer !== null) return;
    const truth: Choice = q.delta > 0 ? "higher" : q.delta < 0 ? "lower" : "same";
    const ok = c === truth;
    setAnswer(c);
    setStats((s) => ({ ok: s.ok + (ok ? 1 : 0), total: s.total + 1 }));
    setCents((v) => (ok ? Math.max(15, Math.round(v * 0.8)) : Math.min(200, Math.round(v * 1.3))));
  };

  const truth: Choice | null = q ? (q.delta > 0 ? "higher" : q.delta < 0 ? "lower" : "same") : null;

  return (
    <WidgetFrame title="Trop haut ou trop bas ?" right={<span className="text-xs text-fg-subtle">écart : {cents} cents</span>}>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Button variant="secondary" full onClick={() => q && play(q)} disabled={!q}>🔁 Réécouter</Button>
          <Button full onClick={next}>{q ? "Suivant →" : "▶ Écouter"}</Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["lower", "same", "higher"] as Choice[]).map((c) => {
            const state = answer === null ? "idle" : c === truth ? "correct" : c === answer ? "wrong" : "idle";
            return (
              <button
                key={c}
                onClick={() => choose(c)}
                disabled={!q || answer !== null}
                className={cn(
                  "rounded-xl border px-3 py-3 text-sm font-medium transition-colors disabled:opacity-70",
                  state === "correct" && "border-success bg-success/15 text-success",
                  state === "wrong" && "border-danger bg-danger/15 text-danger",
                  state === "idle" && "border-border-strong bg-surface hover:border-accent",
                )}
              >
                {c === "lower" ? "↓ Plus basse" : c === "same" ? "= Identique" : "↑ Plus haute"}
              </button>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-fg-subtle">
          <span>{answer !== null && (answer === truth ? "✓ Exact" : "✗ Réécoute et compare la « lumière » du son.")}</span>
          <span>{stats.ok} / {stats.total}</span>
        </div>
        <p className="text-[11px] text-fg-subtle">100 cents = un demi-ton. L&apos;écart diminue quand tu réussis.</p>
      </div>
    </WidgetFrame>
  );
}
