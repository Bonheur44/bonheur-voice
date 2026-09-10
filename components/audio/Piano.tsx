"use client";

import { useEffect, useRef } from "react";
import { getAudioEngine, type PlayingNote } from "@/lib/audio/engine";
import { isBlackKey, midiToName } from "@/lib/audio/notes";
import { cn } from "@/lib/utils";

/**
 * Durée minimale de résonance d'une touche, en secondes.
 * Assez pour reconnaître la note et la chanter, sans traîner d'une touche à l'autre.
 */
const MIN_SOUNDING = 3;

export function Piano({
  from = 48,
  to = 72,
  highlight = [],
  lowMark,
  highMark,
  onPress,
  className,
}: {
  from?: number;
  to?: number;
  highlight?: number[];
  lowMark?: number;
  highMark?: number;
  onPress?: (midi: number) => void;
  className?: string;
}) {
  const playing = useRef<Map<number, PlayingNote>>(new Map());

  // Une touche relâchée aussitôt doit tout de même s'entendre : on laisse la note
  // résonner, comme sur un piano dont la corde ne s'arrête pas avec le doigt.
  const held = useRef<Map<number, PlayingNote>>(new Map());
  useEffect(
    () => () => {
      // Sans cela, une touche encore enfoncée au moment où l'on quitte la page
      // continuerait de sonner indéfiniment : le relâchement n'arrive jamais.
      held.current.forEach((n) => n.stop());
      held.current.clear();
    },
    [],
  );

  const keys: number[] = [];
  for (let m = from; m <= to; m++) keys.push(m);
  const whites = keys.filter((k) => !isBlackKey(k));

  const down = (midi: number) => {
    const eng = getAudioEngine();
    playing.current.get(midi)?.stop();
    const note = eng.start(midi, "piano", undefined, 1, MIN_SOUNDING);
    playing.current.set(midi, note);
    held.current.set(midi, note);
    onPress?.(midi);
  };

  const up = (midi: number) => {
    const n = playing.current.get(midi);
    if (n) {
      // Le moteur repousse l'arrêt jusqu'à la durée minimale : la note continue
      // de sonner et de décroître seule après cet appel.
      n.stop();
      playing.current.delete(midi);
      held.current.delete(midi);
    }
  };

  return (
    <div className={cn("overflow-x-auto scrollbar-none", className)}>
      <div className="relative select-none" style={{ width: Math.max(whites.length * 44, 320), height: 150 }}>
        {whites.map((midi, i) => {
          const inRange = lowMark !== undefined && highMark !== undefined && midi >= lowMark && midi <= highMark;
          const hl = highlight.includes(midi);
          return (
            <button
              key={midi}
              type="button"
              aria-label={midiToName(midi)}
              onPointerDown={(e) => {
                e.preventDefault();
                try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); } catch { /* événement synthétique */ }
                down(midi);
              }}
              onPointerUp={() => up(midi)}
              onPointerLeave={() => up(midi)}
              onPointerCancel={() => up(midi)}
              className={cn(
                "absolute top-0 h-full rounded-b-lg border border-border-strong active:translate-y-px transition-colors",
                hl ? "bg-accent text-black" : inRange ? "bg-[#f4f1ea] text-black" : "bg-[#d9d6cf] text-black/60",
                (midi === lowMark || midi === highMark) && "ring-2 ring-accent ring-inset",
              )}
              style={{ left: i * 44, width: 42 }}
            >
              <span className="absolute bottom-1.5 left-0 right-0 text-center text-[10px] font-semibold">{midi % 12 === 0 ? midiToName(midi) : ""}</span>
            </button>
          );
        })}
        {keys
          .filter((k) => isBlackKey(k))
          .map((midi) => {
            const whiteIndex = whites.filter((w) => w < midi).length;
            const hl = highlight.includes(midi);
            return (
              <button
                key={midi}
                type="button"
                aria-label={midiToName(midi)}
                onPointerDown={(e) => {
                  e.preventDefault();
                  try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); } catch { /* événement synthétique */ }
                  down(midi);
                }}
                onPointerUp={() => up(midi)}
                onPointerLeave={() => up(midi)}
                onPointerCancel={() => up(midi)}
                className={cn("absolute top-0 z-10 h-[60%] rounded-b-md border border-black active:translate-y-px", hl ? "bg-accent" : "bg-[#1a1d25]")}
                style={{ left: whiteIndex * 44 - 13, width: 26 }}
              />
            );
          })}
      </div>
    </div>
  );
}
