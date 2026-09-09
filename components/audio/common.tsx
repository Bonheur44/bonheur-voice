"use client";

import { useEffect, useRef, useState } from "react";
import { Callout } from "@/components/ui";
import { getPitchDetector, isMicSupported, type PitchFrame } from "@/lib/audio/pitch-detector";
import { useAppStore } from "@/lib/store";

/** Zone confortable de l'utilisateur (MIDI). */
export function useRange() {
  const low = useAppStore((s) => s.profile.lowNote);
  const high = useAppStore((s) => s.profile.highNote);
  return { low, high, center: Math.round((low + high) / 2) };
}

export type MicStatus = "idle" | "starting" | "on" | "denied" | "unsupported";

/**
 * Abonnement au détecteur de hauteur.
 * `onFrame` est appelé à chaque trame (hors cycle React) ; `frame` est une copie limitée à ~30 fps pour l'affichage.
 */
export function usePitch(active: boolean, onFrame?: (f: PitchFrame) => void) {
  const [frame, setFrame] = useState<PitchFrame | null>(null);
  const [result, setResult] = useState<"on" | "denied" | null>(null);
  const cbRef = useRef(onFrame);

  useEffect(() => {
    cbRef.current = onFrame;
  });

  const [prevActive, setPrevActive] = useState(active);
  if (active !== prevActive) {
    setPrevActive(active);
    setResult(null);
    setFrame(null);
  }

  useEffect(() => {
    if (!active || !isMicSupported()) return;
    const det = getPitchDetector();
    let cancelled = false;
    det
      .start()
      .then(() => {
        if (!cancelled) setResult("on");
      })
      .catch(() => {
        if (!cancelled) setResult("denied");
      });
    let last = 0;
    const unsub = det.subscribe((f) => {
      cbRef.current?.(f);
      if (f.time - last > 33) {
        last = f.time;
        setFrame(f);
      }
    });
    return () => {
      cancelled = true;
      unsub();
      det.stop();
    };
  }, [active]);

  const status: MicStatus = !active ? "idle" : !isMicSupported() ? "unsupported" : (result ?? "starting");
  return { frame, status };
}

export function MicNotice({ status }: { status: MicStatus }) {
  if (status === "denied")
    return (
      <Callout tone="warning" title="Micro non autorisé">
        Autorise le micro dans ton navigateur pour obtenir un repère de hauteur. Tu peux aussi faire l&apos;exercice à l&apos;oreille, avec le bourdon.
      </Callout>
    );
  if (status === "unsupported")
    return (
      <Callout tone="warning" title="Micro non disponible">
        Ce navigateur ne permet pas l&apos;accès au micro. Fais l&apos;exercice à l&apos;oreille.
      </Callout>
    );
  return null;
}

export function MicLimits() {
  return (
    <p className="text-[11px] leading-relaxed text-fg-subtle">
      Repère approximatif : la détection fonctionne pour une voix seule et tenue, dans une pièce calme. Elle se trompe parfois d&apos;une octave et n&apos;est pas fiable sur les attaques ni les consonnes. Ce n&apos;est pas une mesure, c&apos;est une aide.
    </p>
  );
}

export function WidgetFrame({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

/** Indicateur de niveau micro. */
export function LevelMeter({ level }: { level: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
      <div className="h-full bg-success transition-[width] duration-75" style={{ width: `${Math.min(100, level * 100)}%` }} />
    </div>
  );
}

/** Écart en cents ramené dans [-600, 600] (tolérance d'octave). */
export function foldCents(cents: number): number {
  let c = cents;
  while (c > 600) c -= 1200;
  while (c < -600) c += 1200;
  return c;
}
