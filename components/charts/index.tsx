"use client";

import type { MeasuredWeek } from "@/lib/progression";
import { SKILLS } from "@/lib/skills";
import { formatDuration } from "@/lib/utils";

/**
 * Évolution des compétences mesurées, semaine par semaine.
 *
 * Deux courbes, avec des trous là où une semaine n'a pas assez de mesures : un
 * trou est une information, pas un défaut d'affichage. Le graphique est
 * toujours rendu, même vide, pour que l'absence de données se lise à l'écran.
 */
export function MeasuredTrend({ history, height = 150 }: { history: MeasuredWeek[]; height?: number }) {
  const w = 320;
  const padL = 26;
  const padR = 8;
  const padT = 10;
  const padB = 22;
  const innerW = w - padL - padR;
  const innerH = height - padT - padB;
  const x = (i: number) => padL + (history.length <= 1 ? innerW / 2 : (i / (history.length - 1)) * innerW);
  const y = (v: number) => padT + (1 - v / 100) * innerH;

  const pathOf = (key: "pitch" | "stability") => {
    let d = "";
    let pen = false;
    history.forEach((h, i) => {
      const v = h[key];
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      pen = true;
    });
    return d.trim();
  };

  const plotted = history.filter((h) => h.pitch !== null || h.stability !== null).length;
  const series: Array<{ key: "pitch" | "stability"; color: string; label: string }> = [
    { key: "pitch", color: SKILLS.pitch.color, label: SKILLS.pitch.label },
    { key: "stability", color: SKILLS.stability.color, label: SKILLS.stability.label },
  ];
  const weekLabel = (i: number) => new Date(history[i].weekStart).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const labelled = history.length > 0 ? [0, Math.floor((history.length - 1) / 2), history.length - 1] : [];

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} role="img" aria-label="Évolution mesurée">
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={padL} y1={y(v)} x2={w - padR} y2={y(v)} stroke="rgba(255,255,255,0.08)" />
            <text x={padL - 4} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="var(--color-fg-subtle)">
              {v}
            </text>
          </g>
        ))}
        {series.map((s) => (
          <g key={s.key}>
            <path d={pathOf(s.key)} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            {history.map((h, i) => (h[s.key] === null ? null : <circle key={i} cx={x(i)} cy={y(h[s.key] as number)} r={3} fill={s.color} />))}
          </g>
        ))}
        {labelled.map((i) => (
          <text key={i} x={x(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === history.length - 1 ? "end" : "middle"} fontSize={9} fill="var(--color-fg-subtle)">
            {weekLabel(i)}
          </text>
        ))}
        {plotted < 2 && (
          <text x={padL + innerW / 2} y={padT + innerH / 2} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="var(--color-fg-muted)">
            Pas encore assez de mesures pour tracer une évolution.
          </text>
        )}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden />
            {s.label}
          </span>
        ))}
        <span className="text-fg-subtle">Une semaine sans au moins quatre mesures reste vide.</span>
      </div>
    </div>
  );
}

/** Barres hebdomadaires (minutes). */
export function WeeklyBars({ data }: { data: Array<{ weekStart: string; seconds: number; sessions: number }> }) {
  const max = Math.max(60, ...data.map((d) => d.seconds));
  return (
    <div className="flex items-end gap-2 h-36">
      {data.map((d, i) => {
        const h = (d.seconds / max) * 100;
        const label = new Date(d.weekStart).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
        return (
          <div key={d.weekStart} className="flex-1 flex flex-col items-center gap-1 h-full justify-end" title={`${label} : ${formatDuration(d.seconds)}, ${d.sessions} séance(s)`}>
            <div className="text-[10px] font-mono text-fg-subtle">{d.seconds > 0 ? Math.round(d.seconds / 60) : ""}</div>
            <div className={`w-full rounded-t-md ${i === data.length - 1 ? "bg-accent" : "bg-surface-3"}`} style={{ height: `${Math.max(h, d.seconds > 0 ? 4 : 1)}%` }} />
            <div className="text-[10px] text-fg-subtle whitespace-nowrap">{label}</div>
          </div>
        );
      })}
    </div>
  );
}

/** Grille d'activité sur 28 jours. */
export function ActivityGrid({ data }: { data: Array<{ date: string; seconds: number }> }) {
  const max = Math.max(600, ...data.map((d) => d.seconds));
  return (
    <div className="grid grid-cols-7 gap-1.5" role="img" aria-label="Activité des 28 derniers jours">
      {data.map((d) => {
        const ratio = d.seconds / max;
        const bg = d.seconds === 0 ? "var(--color-surface-3)" : `rgba(245,158,11,${0.3 + ratio * 0.7})`;
        return <div key={d.date} className="aspect-square rounded-md" style={{ background: bg }} title={`${new Date(d.date).toLocaleDateString("fr-FR")} : ${formatDuration(d.seconds)}`} />;
      })}
    </div>
  );
}

/** Courbe simple. */
export function LineChart({ points, color = "var(--color-accent)", height = 80 }: { points: number[]; color?: string; height?: number }) {
  if (points.length < 2) return <div className="text-xs text-fg-subtle">Pas encore assez de données.</div>;
  const w = 300;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${(i / (points.length - 1)) * w},${height - 6 - ((p - min) / span) * (height - 12)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} role="img" aria-label="Courbe">
      <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
