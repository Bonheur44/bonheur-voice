"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Callout } from "@/components/ui";
import { WidgetFrame, useRange } from "./common";
import { CHORALES } from "@/data/music/chorale";
import type { VoicePart } from "@/data/music/types";
import { getAudioEngine, type PlayingNote } from "@/lib/audio/engine";
import { midiToName } from "@/lib/audio/notes";
import { fitShift, melodyToTimeline } from "@/lib/audio/transpose";
import { cn } from "@/lib/utils";

const VOICES: Array<{ id: VoicePart; label: string; color: string }> = [
  { id: "S", label: "Soprano", color: "#f472b6" },
  { id: "A", label: "Alto", color: "#a78bfa" },
  { id: "T", label: "Ténor", color: "#f59e0b" },
  { id: "B", label: "Basse", color: "#38bdf8" },
];

const STEPS = [
  { title: "1. Écoute ta ligne", hint: "Ténor seul. Écoute, puis chante avec." },
  { title: "2. Chante avec ta ligne", hint: "Ténor à 100 %, une autre voix à 50 %." },
  { title: "3. Ajoute les voix", hint: "Toutes les voix, ténor encore présent." },
  { title: "4. Réduis ta ligne", hint: "Ténor à 30 % : c'est toi qui portes la ligne." },
  { title: "5. Tiens ta ligne seul", hint: "Ténor à 0 %. Les autres chantent, tu tiens." },
];

/**
 * Mode chorale : lecture SATB synthétique avec volume par voix.
 * Les voix sont des timbres synthétiques, pas des enregistrements : le but est l'indépendance auditive.
 */
export function ChoirMode({
  pieceId = "chorale-1",
  initialVoices,
  initialTenorVolume,
  transpose = 0,
  listenOnly = false,
}: {
  pieceId?: string;
  initialVoices?: Array<"S" | "A" | "B">;
  initialTenorVolume?: number;
  transpose?: number;
  listenOnly?: boolean;
}) {
  const piece = CHORALES[pieceId];
  const { low, high } = useRange();
  const [volumes, setVolumes] = useState<Record<VoicePart, number>>(() => ({
    S: initialVoices ? (initialVoices.includes("S") ? 0.8 : 0) : 0,
    A: initialVoices ? (initialVoices.includes("A") ? 0.8 : 0) : 0,
    T: initialTenorVolume ?? 1,
    B: initialVoices ? (initialVoices.includes("B") ? 0.8 : 0) : 0,
  }));
  const [step, setStep] = useState(initialVoices ? -1 : 0);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [countIn, setCountIn] = useState(true);
  const [userShift, setUserShift] = useState(0);
  const gainsRef = useRef<Record<VoicePart, GainNode | null>>({ S: null, A: null, T: null, B: null });
  const handlesRef = useRef<PlayingNote[]>([]);
  const rafRef = useRef(0);
  const timerRef = useRef(0);

  const autoShift = useMemo(() => (piece ? fitShift(piece.parts.T, low, high) : 0), [piece, low, high]);
  const shift = autoShift + transpose + userShift;

  const stop = () => {
    handlesRef.current.forEach((h) => h.stop());
    handlesRef.current = [];
    cancelAnimationFrame(rafRef.current);
    window.clearTimeout(timerRef.current);
    setPlaying(false);
    setPosition(0);
  };
  const stopRef = useRef(stop);
  useEffect(() => {
    stopRef.current = stop;
  });
  useEffect(() => () => stopRef.current(), []);

  // Volume live
  useEffect(() => {
    const eng = getAudioEngine();
    (Object.keys(volumes) as VoicePart[]).forEach((v) => {
      const g = gainsRef.current[v];
      if (g && eng.context) g.gain.setTargetAtTime(volumes[v], eng.context.currentTime, 0.05);
    });
  }, [volumes]);

  if (!piece) return <WidgetFrame title="Mode chorale">Pièce introuvable.</WidgetFrame>;

  const beat = 60 / piece.bpm;
  const totalDur = piece.bars * piece.beatsPerBar * beat;

  const play = () => {
    stop();
    const eng = getAudioEngine();
    const ctx = eng.ensure();
    const lead = countIn ? piece.beatsPerBar * beat : 0;
    const t0 = ctx.currentTime + 0.1;
    if (countIn) for (let i = 0; i < piece.beatsPerBar; i++) eng.click(i === 0, t0 + i * beat);

    (Object.keys(piece.parts) as VoicePart[]).forEach((v) => {
      const bus = eng.createBus(volumes[v]);
      gainsRef.current[v] = bus;
      const tl = melodyToTimeline(piece.parts[v], piece.bpm, shift);
      tl.forEach((ev) => {
        if (ev.midi === null) return;
        const n = eng.start(ev.midi, v, t0 + lead + ev.start, 1);
        // reroute la sortie de la note vers le bus de la voix
        n.gain.disconnect();
        n.gain.connect(bus);
        n.stop(t0 + lead + ev.start + ev.duration - 0.05);
        handlesRef.current.push(n);
      });
    });

    setPlaying(true);
    const startWall = performance.now() + (t0 - ctx.currentTime) * 1000 + lead * 1000;
    const tick = () => {
      const p = (performance.now() - startWall) / 1000 / totalDur;
      setPosition(Math.max(0, Math.min(1, p)));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    timerRef.current = window.setTimeout(() => stop(), (lead + totalDur) * 1000 + 500);
  };

  const applyStep = (i: number) => {
    setStep(i);
    const presets: Record<VoicePart, number>[] = [
      { S: 0, A: 0, T: 1, B: 0 },
      { S: 0, A: 0, T: 1, B: 0.5 },
      { S: 0.8, A: 0.8, T: 0.8, B: 0.8 },
      { S: 0.8, A: 0.8, T: 0.3, B: 0.8 },
      { S: 0.8, A: 0.8, T: 0, B: 0.8 },
    ];
    setVolumes(presets[i]);
  };

  // Visualisation : notes de chaque voix sur une grille de temps
  const minMidi = Math.min(...(Object.values(piece.parts).flat().map((n) => (n.midi ?? 60) + shift)));
  const maxMidi = Math.max(...(Object.values(piece.parts).flat().map((n) => (n.midi ?? 60) + shift)));
  const totalBeats = piece.bars * piece.beatsPerBar;

  return (
    <WidgetFrame
      title="Mode chorale"
      right={
        <Button size="sm" variant={playing ? "secondary" : "primary"} onClick={playing ? stop : play}>
          {playing ? "■ Stop" : "▶ Jouer"}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {!listenOnly && (
          <div className="flex flex-wrap gap-1.5">
            {STEPS.map((s, i) => (
              <button key={i} onClick={() => applyStep(i)} className={cn("rounded-full border px-3 py-1 text-xs font-medium", i === step ? "border-accent bg-accent-soft text-accent-strong" : "border-border-strong text-fg-muted hover:text-fg")}>
                {s.title}
              </button>
            ))}
          </div>
        )}
        {step >= 0 && !listenOnly && <p className="text-sm text-fg-muted">{STEPS[step].hint}</p>}
        {listenOnly && <Callout tone="info">Écoute seulement : suis la ligne ambre (ténor) sans chanter. Baisse les autres voix si tu la perds.</Callout>}

        {/* Piano-roll */}
        <div className="rounded-xl bg-surface-3 p-2">
          <svg viewBox={`0 0 ${totalBeats * 20} 140`} className="w-full h-36" role="img" aria-label="Partition simplifiée des quatre voix">
            {Array.from({ length: piece.bars + 1 }).map((_, i) => (
              <line key={i} x1={i * piece.beatsPerBar * 20} y1={0} x2={i * piece.beatsPerBar * 20} y2={140} stroke="rgba(255,255,255,0.08)" />
            ))}
            {VOICES.map((v) => {
              let t = 0;
              return piece.parts[v.id].map((n, i) => {
                const x = t * 20;
                const w = n.beats * 20 - 2;
                t += n.beats;
                if (n.midi === null) return null;
                const y = 130 - (((n.midi + shift) - minMidi) / Math.max(1, maxMidi - minMidi)) * 120;
                const vol = volumes[v.id];
                return <rect key={`${v.id}-${i}`} x={x + 1} y={y - 4} width={w} height={8} rx={3} fill={v.color} opacity={v.id === "T" ? 0.35 + vol * 0.65 : 0.15 + vol * 0.75} />;
              });
            })}
            {playing && <line x1={position * totalBeats * 20} y1={0} x2={position * totalBeats * 20} y2={140} stroke="white" strokeWidth={1.5} />}
          </svg>
        </div>

        {/* Mixeur */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {VOICES.map((v) => (
            <div key={v.id} className="rounded-xl border border-border bg-surface p-3">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold" style={{ color: v.color }}>{v.label}</span>
                <span className="font-mono text-fg-subtle">{Math.round(volumes[v.id] * 100)}%</span>
              </div>
              <input type="range" min={0} max={1} step={0.05} value={volumes[v.id]} onChange={(e) => setVolumes((vol) => ({ ...vol, [v.id]: Number(e.target.value) }))} aria-label={`Volume ${v.label}`} />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-fg-subtle">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={countIn} onChange={(e) => setCountIn(e.target.checked)} className="accent-amber-500" /> Décompte d&apos;une mesure
          </label>
          <div className="flex items-center gap-1">
            Tonalité
            <button onClick={() => setUserShift((s) => s - 1)} className="rounded-md px-2 py-0.5 hover:text-fg" aria-label="Un demi-ton plus bas">−</button>
            <span className="font-mono w-8 text-center">{shift > 0 ? `+${shift}` : shift}</span>
            <button onClick={() => setUserShift((s) => s + 1)} className="rounded-md px-2 py-0.5 hover:text-fg" aria-label="Un demi-ton plus haut">+</button>
          </div>
          <span>
            Ténor : {midiToName(Math.min(...piece.parts.T.map((n) => (n.midi ?? 0) + shift)))} – {midiToName(Math.max(...piece.parts.T.map((n) => (n.midi ?? 0) + shift)))}
          </span>
        </div>
        {piece.text && <p className="text-sm italic text-fg-muted">« {piece.text} »</p>}
        <p className="text-[11px] text-fg-subtle">Les voix sont synthétiques (pas des enregistrements). L&apos;objectif est d&apos;entraîner ton oreille à isoler et tenir ta ligne, pas de reproduire un vrai chœur.</p>
      </div>
    </WidgetFrame>
  );
}
