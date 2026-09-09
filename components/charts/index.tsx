"use client";

import { SKILLS, SKILL_ORDER } from "@/lib/skills";
import type { SkillId, SkillState } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

/** Radar des compétences (SVG maison). */
export function SkillRadar({ skills, size = 260 }: { skills: Record<SkillId, SkillState>; size?: number }) {
  const ids = SKILL_ORDER;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 48;
  const point = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / ids.length - Math.PI / 2;
    return [cx + Math.cos(a) * r * v, cy + Math.sin(a) * r * v] as const;
  };
  const poly = ids.map((id, i) => point(i, skills[id].score / 100)).map(([x, y]) => `${x},${y}`).join(" ");
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[320px] mx-auto" role="img" aria-label="Radar des compétences">
      {[0.25, 0.5, 0.75, 1].map((v) => (
        <polygon key={v} points={ids.map((_, i) => point(i, v).join(",")).join(" ")} fill="none" stroke="rgba(255,255,255,0.08)" />
      ))}
      {ids.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" />;
      })}
      <polygon points={poly} fill="rgba(245,158,11,0.22)" stroke="var(--color-accent)" strokeWidth={2} strokeLinejoin="round" />
      {ids.map((id, i) => {
        const [x, y] = point(i, skills[id].score / 100);
        return <circle key={id} cx={x} cy={y} r={3.5} fill={SKILLS[id].color} />;
      })}
      {ids.map((id, i) => {
        const [x, y] = point(i, 1.3);
        return (
          <text key={id} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="var(--color-fg-muted)">
            {SKILLS[id].shortLabel}
          </text>
        );
      })}
    </svg>
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
