"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { LevelMeter, MicLimits, MicNotice, WidgetFrame, foldCents, usePitch, useRange } from "./common";
import { getAudioEngine } from "@/lib/audio/engine";
import { centsOff, midiToName } from "@/lib/audio/notes";

/** Tenue de note : visualise la dérive de hauteur en cents pendant N secondes. */
export function SustainMeter({ seconds }: { seconds: number }) {
  const { low, high, center } = useRange();
  const [target, setTarget] = useState(center);
  const [micOn, setMicOn] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [trace, setTrace] = useState<number[]>([]);
  const [summary, setSummary] = useState<{ spread: number; mean: number; coverage: number } | null>(null);
  const traceRef = useRef<Array<number | null>>([]);
  const startRef = useRef(0);
  const recordingRef = useRef(false);
  const targetRef = useRef(target);
  const lastPush = useRef(0);

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  const { frame, status } = usePitch(micOn, (f) => {
    if (!recordingRef.current) return;
    if (f.time - lastPush.current < 40) return;
    lastPush.current = f.time;
    let v: number | null = null;
    if (f.frequency && f.clarity > 0.85 && f.level > 0.03) v = foldCents(centsOff(f.frequency, targetRef.current));
    traceRef.current.push(v);
    setTrace(traceRef.current.filter((x): x is number => x !== null).slice(-150));
  });

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => {
      const t = (performance.now() - startRef.current) / 1000;
      setElapsed(t);
      if (t >= seconds) {
        recordingRef.current = false;
        setRecording(false);
        const valid = traceRef.current.filter((v): v is number => v !== null);
        if (valid.length > 5) {
          const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
          const sd = Math.sqrt(valid.reduce((a, b) => a + (b - mean) ** 2, 0) / valid.length);
          setSummary({ spread: sd, mean, coverage: valid.length / Math.max(1, traceRef.current.length) });
        } else {
          setSummary({ spread: 0, mean: 0, coverage: 0 });
        }
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [recording, seconds]);

  const start = () => {
    traceRef.current = [];
    setTrace([]);
    setSummary(null);
    setElapsed(0);
    getAudioEngine().play(target, 1, "piano");
    window.setTimeout(() => {
      startRef.current = performance.now();
      recordingRef.current = true;
      setRecording(true);
    }, 1100);
  };

  const w = 320;
  const h = 100;
  const path = trace.length > 1 ? trace.map((c, i) => `${i === 0 ? "M" : "L"}${(i / (trace.length - 1)) * w},${h / 2 - Math.max(-50, Math.min(50, c))}`).join(" ") : "";
  const quality = summary ? (summary.coverage < 0.4 ? "Peu de signal" : summary.spread < 12 ? "Très stable" : summary.spread < 25 ? "Stable" : summary.spread < 45 ? "Ondulante" : "Instable") : null;

  return (
    <WidgetFrame
      title={`Note droite ${seconds} s`}
      right={
        <Button size="sm" variant={micOn ? "secondary" : "primary"} onClick={() => setMicOn((v) => !v)} aria-pressed={micOn}>
          {micOn ? "🎙️ Micro actif" : "🎙️ Activer le micro"}
        </Button>
      }
    >
      <MicNotice status={status} />
      <div className="mt-2 flex items-center justify-between">
        <Button size="sm" variant="secondary" onClick={() => setTarget((t) => Math.max(low, t - 1))} disabled={recording || target <= low} aria-label="Note plus basse">↓</Button>
        <div className="text-center">
          <div className="text-[11px] uppercase tracking-[0.14em] text-fg-subtle">Note</div>
          <div className="font-mono text-3xl font-semibold tabular-nums">{midiToName(target)}</div>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setTarget((t) => Math.min(high, t + 1))} disabled={recording || target >= high} aria-label="Note plus haute">↑</Button>
      </div>

      <div className="mt-3 rounded-xl bg-surface-3 p-2">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full" role="img" aria-label="Courbe de stabilité">
          <rect x={0} y={h / 2 - 20} width={w} height={40} fill="rgba(52,211,153,0.12)" />
          <line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke="rgba(52,211,153,0.7)" strokeWidth={1} strokeDasharray="4 4" />
          {path && <path d={path} fill="none" stroke="var(--color-accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
          {recording && <rect x={0} y={0} width={(elapsed / seconds) * w} height={3} fill="var(--color-accent)" />}
        </svg>
        <div className="flex justify-between px-1 text-[10px] text-fg-subtle">
          <span>bande verte = ±20 cents</span>
          <span>{recording ? `${elapsed.toFixed(1)} s` : summary ? `${seconds} s` : ""}</span>
        </div>
      </div>
      {frame && (
        <div className="mt-2">
          <LevelMeter level={frame.level} />
        </div>
      )}

      <div className="mt-3 min-h-10 text-center text-sm">
        {summary && quality && (
          <div>
            <span className="font-semibold">{quality}</span>
            {summary.coverage >= 0.4 && (
              <span className="text-fg-muted">
                {" "}· dérive moyenne {summary.mean > 0 ? "+" : ""}
                {Math.round(summary.mean)} cents
              </span>
            )}
          </div>
        )}
        {!summary && !recording && <span className="text-fg-muted">La note est jouée, puis l&apos;enregistrement démarre. Chante « ou » à volume doux.</span>}
        {recording && <span className="text-accent-strong animate-pulse-soft">Tiens la note…</span>}
      </div>

      <Button full className="mt-2" onClick={start} disabled={recording}>
        {summary ? "🔁 Recommencer" : "▶ Jouer la note et tenir"}
      </Button>
      <div className="mt-3">
        <MicLimits />
      </div>
    </WidgetFrame>
  );
}
