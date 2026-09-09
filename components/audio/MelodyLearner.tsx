"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Segmented } from "@/components/ui";
import { WidgetFrame, useRange } from "./common";
import { MELODIES_BY_ID } from "@/data/music/melodies";
import { playTimeline } from "@/lib/audio/engine";
import { midiToName } from "@/lib/audio/notes";
import { fitShift, melodyToTimeline } from "@/lib/audio/transpose";
import { cn } from "@/lib/utils";

type Mode = "note" | "phrase" | "all";

/** Apprentissage d'une mélodie : note par note, phrase par phrase, ou en entier. */
export function MelodyLearner({ melodyId, transpose = 0 }: { melodyId: string; transpose?: number }) {
  const melody = MELODIES_BY_ID[melodyId];
  const { low, high } = useRange();
  const [mode, setMode] = useState<Mode>(melody?.mode === "fragments" ? "phrase" : "phrase");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [noteIdx, setNoteIdx] = useState(0);
  const [activeNote, setActiveNote] = useState<{ p: number; n: number } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [shiftUser, setShiftUser] = useState(0);
  const stopRef = useRef<() => void>(() => {});
  const timerRef = useRef(0);

  const allNotes = useMemo(() => melody?.phrases.flatMap((p) => p.notes) ?? [], [melody]);
  const autoShift = useMemo(() => fitShift(allNotes, low, high), [allNotes, low, high]);
  const shift = autoShift + transpose + shiftUser;

  useEffect(() => () => { stopRef.current(); window.clearTimeout(timerRef.current); }, []);

  if (!melody) return <WidgetFrame title="Mélodie">Mélodie introuvable.</WidgetFrame>;

  const bpm = melody.bpm * speed;
  const phrase = melody.phrases[phraseIdx];

  const stop = () => {
    stopRef.current();
    window.clearTimeout(timerRef.current);
    setPlaying(false);
    setActiveNote(null);
  };

  const playNotes = (notes: typeof phrase.notes, p: number, offset = 0) => {
    stop();
    const tl = melodyToTimeline(notes, bpm, shift);
    setPlaying(true);
    const h = playTimeline(tl, "piano", 1, (i) => setActiveNote({ p, n: i + offset }));
    stopRef.current = h.stop;
    timerRef.current = window.setTimeout(() => { setPlaying(false); setActiveNote(null); }, h.totalDuration * 1000 + 300);
  };

  const playAll = () => {
    stop();
    const notes = melody.phrases.flatMap((ph) => ph.notes);
    const tl = melodyToTimeline(notes, bpm, shift);
    setPlaying(true);
    // index global → (phrase, note)
    const map: Array<{ p: number; n: number }> = [];
    melody.phrases.forEach((ph, pi) => ph.notes.forEach((_, ni) => map.push({ p: pi, n: ni })));
    const h = playTimeline(tl, "piano", 1, (i) => setActiveNote(map[i]));
    stopRef.current = h.stop;
    timerRef.current = window.setTimeout(() => { setPlaying(false); setActiveNote(null); }, h.totalDuration * 1000 + 300);
  };

  const playCurrent = () => {
    if (mode === "all") return playAll();
    if (mode === "phrase") return playNotes(phrase.notes, phraseIdx);
    const n = phrase.notes[noteIdx];
    playNotes([{ ...n, beats: Math.max(n.beats, 1.5) }], phraseIdx, noteIdx);
  };

  const playUpTo = () => {
    // note par note : joue du début de la phrase jusqu'à la note courante
    playNotes(phrase.notes.slice(0, noteIdx + 1), phraseIdx);
  };

  const modeOptions: Array<{ value: Mode; label: string }> =
    melody.mode === "fragments"
      ? [{ value: "note", label: "Note par note" }, { value: "phrase", label: "Fragment" }]
      : [{ value: "note", label: "Note par note" }, { value: "phrase", label: "Phrase" }, { value: "all", label: "En entier" }];

  return (
    <WidgetFrame title={melody.name} right={<span className="text-xs text-fg-subtle">{Math.round(bpm)} bpm</span>}>
      <div className="flex flex-col gap-3">
        <Segmented options={modeOptions} value={mode} onChange={(m) => { stop(); setMode(m); }} className="self-start" />

        {/* Sélection de phrase */}
        {melody.phrases.length > 1 && mode !== "all" && (
          <div className="flex flex-wrap gap-1.5">
            {melody.phrases.map((p, i) => (
              <button key={i} onClick={() => { stop(); setPhraseIdx(i); setNoteIdx(0); }} className={cn("rounded-full border px-3 py-1 text-xs font-medium", i === phraseIdx ? "border-accent bg-accent-soft text-accent-strong" : "border-border-strong text-fg-muted")}>
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Visualisation des notes */}
        <div className="overflow-x-auto scrollbar-none">
          <div className="flex items-end gap-1 min-w-max py-1">
            {(mode === "all" ? melody.phrases : [phrase]).map((ph, pi) => {
              const realP = mode === "all" ? pi : phraseIdx;
              return (
                <div key={pi} className="flex items-end gap-1 pr-3 mr-1 border-r border-border last:border-r-0">
                  {ph.notes.map((n, ni) => {
                    const active = activeNote?.p === realP && activeNote?.n === ni;
                    const selected = mode === "note" && ni === noteIdx;
                    const midi = n.midi === null ? null : n.midi + shift;
                    const hgt = midi === null ? 8 : 24 + ((midi - low) / Math.max(1, high - low)) * 60;
                    return (
                      <button
                        key={ni}
                        onClick={() => { if (mode === "note") { stop(); setNoteIdx(ni); } }}
                        className="flex flex-col items-center gap-1"
                        style={{ width: Math.max(28, n.beats * 22) }}
                        aria-label={midi === null ? "silence" : midiToName(midi)}
                      >
                        <div className={cn("w-full rounded-md transition-colors", active ? "bg-accent" : selected ? "bg-accent/50" : midi === null ? "bg-transparent" : "bg-surface-3")} style={{ height: hgt }} />
                        <div className="text-[10px] font-mono text-fg-subtle">{midi === null ? "·" : midiToName(midi).replace(/\d/, "")}</div>
                        {n.lyric && <div className="text-[10px] text-fg-muted leading-none">{n.lyric}</div>}
                        {n.breath && <div className="text-[10px] text-sky-400" title="Respiration">ˇ</div>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Contrôles */}
        {mode === "note" ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <Button size="sm" variant="secondary" onClick={() => { stop(); setNoteIdx((i) => Math.max(0, i - 1)); }} disabled={noteIdx === 0}>← Note</Button>
              <span className="font-mono">
                Note {noteIdx + 1} / {phrase.notes.length}
                {phrase.notes[noteIdx].midi !== null && <span className="text-accent-strong"> · {midiToName(phrase.notes[noteIdx].midi! + shift)}</span>}
              </span>
              <Button size="sm" variant="secondary" onClick={() => { stop(); setNoteIdx((i) => Math.min(phrase.notes.length - 1, i + 1)); }} disabled={noteIdx >= phrase.notes.length - 1}>Note →</Button>
            </div>
            <div className="flex gap-2">
              <Button full onClick={playCurrent}>▶ Jouer la note</Button>
              <Button full variant="secondary" onClick={playUpTo}>Depuis le début →</Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button full onClick={playing ? stop : playCurrent}>{playing ? "■ Stop" : mode === "all" ? "▶ Tout jouer" : "▶ Jouer"}</Button>
            {mode === "phrase" && melody.phrases.length > 1 && (
              <Button variant="secondary" onClick={() => { stop(); setPhraseIdx((i) => (i + 1) % melody.phrases.length); setNoteIdx(0); }}>Suivant →</Button>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-fg-subtle">
          <div className="flex items-center gap-1">
            Vitesse
            {[0.6, 0.8, 1].map((s) => (
              <button key={s} onClick={() => setSpeed(s)} className={cn("rounded-md px-2 py-0.5", s === speed ? "bg-accent-soft text-accent-strong" : "hover:text-fg")}>
                {Math.round(s * 100)}%
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            Tonalité
            <button onClick={() => setShiftUser((s) => s - 1)} className="rounded-md px-2 py-0.5 hover:text-fg" aria-label="Un demi-ton plus bas">−</button>
            <span className="font-mono w-8 text-center">{shift > 0 ? `+${shift}` : shift}</span>
            <button onClick={() => setShiftUser((s) => s + 1)} className="rounded-md px-2 py-0.5 hover:text-fg" aria-label="Un demi-ton plus haut">+</button>
          </div>
        </div>
        {melody.text && <p className="text-sm text-fg-muted italic">« {melody.text} »</p>}
      </div>
    </WidgetFrame>
  );
}
