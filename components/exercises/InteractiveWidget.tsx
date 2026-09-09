"use client";

import type { InteractiveSpec } from "@/lib/types";
import { BreathingGuide } from "@/components/audio/BreathingGuide";
import { MetronomeWidget } from "@/components/audio/MetronomeWidget";
import { DroneWidget } from "@/components/audio/DroneWidget";
import { PitchMatch } from "@/components/audio/PitchMatch";
import { CompareTrainer } from "@/components/audio/CompareTrainer";
import { SustainMeter } from "@/components/audio/SustainMeter";
import { IntervalTrainer } from "@/components/audio/IntervalTrainer";
import { ScalePlayer } from "@/components/audio/ScalePlayer";
import { MelodyLearner } from "@/components/audio/MelodyLearner";
import { ChoirMode } from "@/components/audio/ChoirMode";
import { Piano } from "@/components/audio/Piano";
import { useRange } from "@/components/audio/common";

/** Aiguille la spécification interactive d'un exercice vers le bon widget. */
export function InteractiveWidget({ spec, running = true }: { spec: InteractiveSpec; running?: boolean }) {
  const { low, high } = useRange();
  switch (spec.type) {
    case "breathing":
      return <BreathingGuide inhale={spec.inhale} hold={spec.hold} exhale={spec.exhale} rest={spec.rest} running={running} />;
    case "metronome":
      return <MetronomeWidget bpm={spec.bpm} beatsPerBar={spec.beatsPerBar} />;
    case "drone":
      return <DroneWidget offsetFromLow={spec.offsetFromLow} />;
    case "pitch-match":
      return <PitchMatch range={spec.range} />;
    case "compare":
      return <CompareTrainer />;
    case "sustain":
      return <SustainMeter seconds={spec.seconds} />;
    case "interval":
      return <IntervalTrainer intervals={spec.intervals} />;
    case "scale":
      return <ScalePlayer pattern={spec.pattern} bpm={spec.bpm} startOffset={spec.startOffset} />;
    case "melody":
      return <MelodyLearner melodyId={spec.melodyId} />;
    case "choir":
      return <ChoirMode pieceId={spec.pieceId} initialVoices={spec.voices} initialTenorVolume={spec.tenorVolume} transpose={spec.transpose} listenOnly={spec.listenOnly} />;
    case "piano":
      return <Piano from={Math.max(36, low - 5)} to={Math.min(84, high + 5)} lowMark={low} highMark={high} />;
    default:
      return null;
  }
}
