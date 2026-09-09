"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { WidgetFrame, useRange } from "./common";
import { getAudioEngine, type PlayingNote } from "@/lib/audio/engine";
import { clampMidi, midiToFreq, midiToName } from "@/lib/audio/notes";

export function DroneWidget({ offsetFromLow = 5, showRange = true }: { offsetFromLow?: number; showRange?: boolean }) {
  const { low, high } = useRange();
  const [rawMidi, setRawMidi] = useState(() => low + offsetFromLow);
  const midi = clampMidi(rawMidi, low, high);
  const [on, setOn] = useState(false);
  const noteRef = useRef<PlayingNote | null>(null);

  useEffect(() => {
    return () => {
      noteRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (on && noteRef.current) noteRef.current.setFrequency(midiToFreq(midi), undefined, 0.08);
  }, [midi, on]);

  const toggle = () => {
    if (on) {
      noteRef.current?.stop();
      noteRef.current = null;
      setOn(false);
    } else {
      noteRef.current = getAudioEngine().start(midi, "drone");
      setOn(true);
    }
  };

  return (
    <WidgetFrame
      title="Bourdon"
      right={
        <Button size="sm" variant={on ? "secondary" : "primary"} onClick={toggle} aria-pressed={on}>
          {on ? "■ Couper" : "▶ Lancer"}
        </Button>
      }
    >
      <div className="flex items-center justify-between gap-3">
        <Button size="sm" variant="secondary" onClick={() => setRawMidi(midi - 1)} disabled={midi <= low} aria-label="Note plus basse">
          ↓
        </Button>
        <div className="text-center">
          <div className={`font-mono text-3xl font-semibold tabular-nums ${on ? "text-accent-strong" : ""}`}>{midiToName(midi)}</div>
          {showRange && (
            <div className="text-[11px] text-fg-subtle">
              zone {midiToName(low)} – {midiToName(high)}
            </div>
          )}
        </div>
        <Button size="sm" variant="secondary" onClick={() => setRawMidi(midi + 1)} disabled={midi >= high} aria-label="Note plus haute">
          ↑
        </Button>
      </div>
    </WidgetFrame>
  );
}
