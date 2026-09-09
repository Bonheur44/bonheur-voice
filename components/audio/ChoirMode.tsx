"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Callout } from "@/components/ui";
import { CompactSoundSelect } from "./SoundPicker";
import { WidgetFrame, useRange } from "./common";
import { CHORALES } from "@/data/music/chorale";
import type { VoicePart } from "@/data/music/types";
import { getAudioEngine, type PlayingNote } from "@/lib/audio/engine";
import { midiToName } from "@/lib/audio/notes";
import { fitShift, melodyToTimeline } from "@/lib/audio/transpose";
import { useAppStore } from "@/lib/store";
import type { ChoirVoicing } from "@/lib/types";
import { independenceSteps, voicingToVolumes, type LineVolumes } from "@/lib/vocal/choirVoicing";
import { CHOIR_LINES, CHOIR_LINE_IDS } from "@/lib/vocal/voiceParts";
import type { ChoirLine } from "@/lib/vocal/types";
import { cn } from "@/lib/utils";

/**
 * Mode chorale : lecture SATB synthétique avec volume par voix.
 *
 * La ligne travaillée est un paramètre, pas une constante : c'est elle qui est
 * transposée dans la zone de travail de l'utilisateur, mise en évidence dans la
 * partition et désignée dans les consignes. Les autres voix sont décrites par
 * leur rôle — appui, voix qui attire — et non par leur lettre, pour qu'un même
 * exercice serve à une soprano comme à une basse.
 *
 * Les voix sont des timbres synthétiques, pas des enregistrements : le but est
 * l'indépendance auditive.
 */
export function ChoirMode({
  pieceId = "chorale-1",
  others,
  myVolume,
  transpose = 0,
  listenOnly = false,
  line: forcedLine,
}: {
  pieceId?: string;
  others?: ChoirVoicing;
  myVolume?: number;
  transpose?: number;
  listenOnly?: boolean;
  /** Force la ligne travaillée. Par défaut, celle du profil. */
  line?: ChoirLine;
}) {
  const piece = CHORALES[pieceId];
  const profileLine = useAppStore((s) => s.profile.choirLine);
  const setProfileLine = useAppStore((s) => s.updateProfile);
  const line = forcedLine ?? profileLine;
  const { low, high } = useRange();

  const steps = useMemo(() => independenceSteps(line), [line]);
  const preset = useMemo(
    () => (others !== undefined ? voicingToVolumes(line, others, myVolume ?? 1) : null),
    [line, others, myVolume],
  );

  const [volumes, setVolumes] = useState<LineVolumes>(() => preset ?? voicingToVolumes(line, "none", 1));
  const [step, setStep] = useState(preset ? -1 : 0);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [countIn, setCountIn] = useState(true);
  const [userShift, setUserShift] = useState(0);
  const gainsRef = useRef<Record<VoicePart, GainNode | null>>({ S: null, A: null, T: null, B: null });
  const handlesRef = useRef<PlayingNote[]>([]);
  const rafRef = useRef(0);
  const timerRef = useRef(0);

  // Changer de ligne redistribue les volumes sans repasser par un effet.
  const [prevLine, setPrevLine] = useState(line);
  if (line !== prevLine) {
    setPrevLine(line);
    setVolumes(preset ?? (step >= 0 ? steps[step].volumes : voicingToVolumes(line, "none", 1)));
  }

  const autoShift = useMemo(() => (piece ? fitShift(piece.parts[line], low, high) : 0), [piece, line, low, high]);
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
  const myLabel = CHOIR_LINES[line].label;
  const myColor = CHOIR_LINES[line].color;

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
    setVolumes(steps[i].volumes);
  };

  // Visualisation : notes de chaque voix sur une grille de temps
  const minMidi = Math.min(...Object.values(piece.parts).flat().map((n) => (n.midi ?? 60) + shift));
  const maxMidi = Math.max(...Object.values(piece.parts).flat().map((n) => (n.midi ?? 60) + shift));
  const totalBeats = piece.bars * piece.beatsPerBar;
  const myNotes = piece.parts[line].map((n) => (n.midi ?? 0) + shift).filter((m) => m > shift);

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
        {!forcedLine && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-fg-subtle">Ma ligne</span>
            {CHOIR_LINE_IDS.map((id) => (
              <button
                key={id}
                onClick={() => {
                  stop();
                  setProfileLine({ choirLine: id });
                }}
                aria-pressed={id === line}
                className={cn(
                  "rounded-full border px-3 py-1 font-medium",
                  id === line ? "border-accent bg-accent-soft text-accent-strong" : "border-border-strong text-fg-muted hover:text-fg",
                )}
              >
                {CHOIR_LINES[id].label}
              </button>
            ))}
          </div>
        )}

        {!listenOnly && (
          <div className="flex flex-wrap gap-1.5">
            {steps.map((s, i) => (
              <button
                key={i}
                onClick={() => applyStep(i)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  i === step ? "border-accent bg-accent-soft text-accent-strong" : "border-border-strong text-fg-muted hover:text-fg",
                )}
              >
                {s.title}
              </button>
            ))}
          </div>
        )}
        {step >= 0 && !listenOnly && <p className="text-sm text-fg-muted">{steps[step].hint}</p>}
        {listenOnly && (
          <Callout tone="info">
            Écoute seulement : suis ta ligne ({myLabel}, en couleur pleine) sans chanter. Baisse les autres voix si tu la perds.
          </Callout>
        )}

        {/* Piano-roll */}
        <div className="rounded-xl bg-surface-3 p-2">
          <svg viewBox={`0 0 ${totalBeats * 20} 140`} className="w-full h-36" role="img" aria-label={`Partition simplifiée des quatre voix, ligne de ${myLabel} mise en évidence`}>
            {Array.from({ length: piece.bars + 1 }).map((_, i) => (
              <line key={i} x1={i * piece.beatsPerBar * 20} y1={0} x2={i * piece.beatsPerBar * 20} y2={140} stroke="rgba(255,255,255,0.08)" />
            ))}
            {CHOIR_LINE_IDS.map((id) => {
              let t = 0;
              return piece.parts[id].map((n, i) => {
                const x = t * 20;
                const w = n.beats * 20 - 2;
                t += n.beats;
                if (n.midi === null) return null;
                const y = 130 - ((n.midi + shift - minMidi) / Math.max(1, maxMidi - minMidi)) * 120;
                const vol = volumes[id];
                return (
                  <rect
                    key={`${id}-${i}`}
                    x={x + 1}
                    y={y - 4}
                    width={w}
                    height={8}
                    rx={3}
                    fill={CHOIR_LINES[id].color}
                    opacity={id === line ? 0.35 + vol * 0.65 : 0.15 + vol * 0.75}
                  />
                );
              });
            })}
            {playing && <line x1={position * totalBeats * 20} y1={0} x2={position * totalBeats * 20} y2={140} stroke="white" strokeWidth={1.5} />}
          </svg>
        </div>

        {/* Mixeur */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CHOIR_LINE_IDS.map((id) => (
            <div key={id} className={cn("rounded-xl border bg-surface p-3", id === line ? "border-accent/60" : "border-border")}>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold" style={{ color: CHOIR_LINES[id].color }}>
                  {CHOIR_LINES[id].label}
                  {id === line && <span className="ml-1 text-fg-subtle">· moi</span>}
                </span>
                <span className="font-mono text-fg-subtle">{Math.round(volumes[id] * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volumes[id]}
                onChange={(e) => setVolumes((vol) => ({ ...vol, [id]: Number(e.target.value) }))}
                aria-label={`Volume ${CHOIR_LINES[id].label}`}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-fg-subtle">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={countIn} onChange={(e) => setCountIn(e.target.checked)} className="accent-amber-500" /> Décompte d&apos;une mesure
          </label>
          <CompactSoundSelect kind="voices" />
          <div className="flex items-center gap-1">
            Tonalité
            <button onClick={() => setUserShift((s) => s - 1)} className="rounded-md px-2 py-0.5 hover:text-fg" aria-label="Un demi-ton plus bas">−</button>
            <span className="font-mono w-8 text-center">{shift > 0 ? `+${shift}` : shift}</span>
            <button onClick={() => setUserShift((s) => s + 1)} className="rounded-md px-2 py-0.5 hover:text-fg" aria-label="Un demi-ton plus haut">+</button>
          </div>
          {myNotes.length > 0 && (
            <span style={{ color: myColor }}>
              {myLabel} : {midiToName(Math.min(...myNotes))} – {midiToName(Math.max(...myNotes))}
            </span>
          )}
        </div>
        {piece.text && <p className="text-sm italic text-fg-muted">« {piece.text} »</p>}
        <p className="text-[11px] text-fg-subtle">
          Les voix sont synthétiques (pas des enregistrements). L&apos;objectif est d&apos;entraîner ton oreille à isoler et tenir ta ligne, pas de reproduire un vrai chœur.
        </p>
      </div>
    </WidgetFrame>
  );
}
