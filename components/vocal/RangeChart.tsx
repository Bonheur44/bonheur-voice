"use client";

import { midiToName } from "@/lib/audio/notes";
import type { Band, TransitionZone } from "@/lib/vocal/types";
import { cn } from "@/lib/utils";

interface Layer {
  label: string;
  band: Band | null;
  color: string;
  hint: string;
}

/**
 * Les quatre bandes empilées, à l'échelle.
 *
 * L'empilement rend visible ce qui compte pédagogiquement : la zone confortable
 * est plus étroite que l'étendue, et le noyau plus étroit encore. C'est
 * exactement la distinction que l'utilisateur doit intégrer.
 */
export function RangeChart({
  explored,
  reliable,
  comfortable,
  central,
  transitions = [],
  className,
}: {
  explored: Band | null;
  reliable: Band | null;
  comfortable: Band | null;
  central: Band | null;
  transitions?: TransitionZone[];
  className?: string;
}) {
  if (!explored) return null;

  // Une marge d'un demi-ton de chaque côté évite que les bandes touchent le bord.
  const min = explored.low - 1;
  const max = explored.high + 1;
  const span = Math.max(1, max - min);
  const pos = (midi: number) => ((midi - min) / span) * 100;
  const width = (band: Band) => ((band.high - band.low + 1) / span) * 100;

  const layers: Layer[] = [
    { label: "Étendue explorée", band: explored, color: "var(--color-fg-subtle)", hint: "Les notes que tu as produites." },
    { label: "Zone fiable", band: reliable, color: "#38bdf8", hint: "Reproduites avec justesse et stabilité." },
    { label: "Zone confortable", band: comfortable, color: "#34d399", hint: "Sans tension déclarée." },
    { label: "Zone centrale", band: central, color: "#fbbf24", hint: "Là où la voix est la plus assurée." },
  ];

  return (
    <div className={cn("space-y-2.5", className)}>
      {layers.map((layer) => (
        <div key={layer.label}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
            <span className="font-medium">{layer.label}</span>
            <span className="font-mono tabular-nums text-fg-subtle">
              {layer.band ? `${midiToName(layer.band.low)} → ${midiToName(layer.band.high)}` : "—"}
            </span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-surface-3">
            {layer.band && (
              <div
                className="absolute inset-y-0 rounded-full"
                style={{
                  left: `${pos(layer.band.low)}%`,
                  width: `${width(layer.band)}%`,
                  backgroundColor: layer.color,
                  opacity: 0.85,
                }}
              />
            )}
            {transitions.map((t, i) => (
              <div
                key={i}
                className="absolute inset-y-0 border-x border-dashed border-white/50"
                style={{ left: `${pos(t.low)}%`, width: `${Math.max(1.5, width({ low: t.low, high: t.high }))}%` }}
                title="Zone de transition possible"
              />
            ))}
          </div>
          <p className="mt-0.5 text-[11px] text-fg-subtle">{layer.hint}</p>
        </div>
      ))}

      <div className="flex justify-between pt-1 font-mono text-[11px] text-fg-subtle">
        <span>{midiToName(min)}</span>
        <span>{midiToName(max)}</span>
      </div>

      {transitions.length > 0 && (
        <p className="text-[11px] text-fg-subtle">
          Les pointillés marquent une zone où ton comportement vocal semble changer. C&apos;est un indice à confirmer, pas un
          diagnostic de passage de registre.
        </p>
      )}
    </div>
  );
}
