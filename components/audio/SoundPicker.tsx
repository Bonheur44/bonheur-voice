"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui";
import { getAudioEngine } from "@/lib/audio/engine";
import {
  getSoundServerSnapshot,
  getSoundSnapshot,
  setInstrument,
  setVoiceSet,
  subscribeSound,
  type SoundPreferences,
} from "@/lib/audio/preferences";
import { INSTRUMENTS, INSTRUMENT_IDS, VOICE_PARTS, VOICE_SETS, VOICE_SET_IDS, type InstrumentId, type VoiceSetId } from "@/lib/audio/timbres";
import { cn } from "@/lib/utils";

export function useSoundPreferences(): SoundPreferences {
  return useSyncExternalStore(subscribeSound, getSoundSnapshot, getSoundServerSnapshot);
}

/** Arpège court pour comparer les instruments. */
export function previewInstrument(center: number) {
  const engine = getAudioEngine();
  const t = engine.now + 0.05;
  [0, 4, 7, 12].forEach((step, i) => engine.play(center + step, i === 3 ? 1.4 : 0.45, "piano", t + i * 0.28));
}

/** Accord à quatre voix pour comparer les timbres de chœur. */
export function previewVoices(tenor: number) {
  const engine = getAudioEngine();
  const t = engine.now + 0.05;
  const chord: Record<string, number> = { B: tenor - 12, T: tenor, A: tenor + 5, S: tenor + 9 };
  VOICE_PARTS.forEach((part) => engine.play(chord[part], 2.2, part, t));
}

interface OptionListProps<T extends string> {
  options: Array<{ id: T; label: string; description: string }>;
  value: T;
  onChange: (id: T) => void;
  columns?: boolean;
}

function OptionList<T extends string>({ options, value, onChange, columns = true }: OptionListProps<T>) {
  return (
    <div className={cn("grid gap-2", columns && "sm:grid-cols-2")} role="radiogroup">
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.id)}
            className={cn(
              "rounded-xl border p-3 text-left transition-colors",
              selected ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-border-strong",
            )}
          >
            <div className={cn("text-sm font-medium", selected && "text-accent-strong")}>{option.label}</div>
            <div className="mt-0.5 text-[11px] leading-snug text-fg-subtle">{option.description}</div>
          </button>
        );
      })}
    </div>
  );
}

/** Choix du timbre de l'instrument de référence. */
export function InstrumentPicker({ previewNote = 60 }: { previewNote?: number }) {
  const { instrument } = useSoundPreferences();
  return (
    <div>
      <OptionList<InstrumentId>
        options={INSTRUMENT_IDS.map((id) => INSTRUMENTS[id])}
        value={instrument}
        onChange={(id) => {
          setInstrument(id);
          previewInstrument(previewNote);
        }}
      />
      <Button size="sm" variant="secondary" className="mt-3" onClick={() => previewInstrument(previewNote)}>
        🔊 Écouter
      </Button>
    </div>
  );
}

/** Choix du timbre des quatre pupitres. */
export function VoiceSetPicker({ previewNote = 55 }: { previewNote?: number }) {
  const { voiceSet } = useSoundPreferences();
  return (
    <div>
      <OptionList<VoiceSetId>
        options={VOICE_SET_IDS.map((id) => VOICE_SETS[id])}
        value={voiceSet}
        onChange={(id) => {
          setVoiceSet(id);
          previewVoices(previewNote);
        }}
      />
      <Button size="sm" variant="secondary" className="mt-3" onClick={() => previewVoices(previewNote)}>
        🔊 Écouter l&apos;accord
      </Button>
    </div>
  );
}

/** Sélecteur compact, pour les écrans où le choix est secondaire. */
export function CompactSoundSelect({ kind, className }: { kind: "instrument" | "voices"; className?: string }) {
  const preferences = useSoundPreferences();
  const isInstrument = kind === "instrument";
  return (
    <label className={cn("flex items-center gap-2 text-xs text-fg-subtle", className)}>
      <span>{isInstrument ? "Timbre" : "Voix"}</span>
      <select
        value={isInstrument ? preferences.instrument : preferences.voiceSet}
        onChange={(e) => (isInstrument ? setInstrument(e.target.value as InstrumentId) : setVoiceSet(e.target.value as VoiceSetId))}
        className="h-8 rounded-lg border border-border bg-surface-2 px-2 text-xs text-fg outline-none focus:border-accent"
        aria-label={isInstrument ? "Timbre de l'instrument" : "Timbre des voix"}
      >
        {isInstrument
          ? INSTRUMENT_IDS.map((id) => (
              <option key={id} value={id}>
                {INSTRUMENTS[id].label}
              </option>
            ))
          : VOICE_SET_IDS.map((id) => (
              <option key={id} value={id}>
                {VOICE_SETS[id].label}
              </option>
            ))}
      </select>
    </label>
  );
}
