"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Eyebrow } from "@/components/ui";
import { EXERCISES } from "@/data/exercises";
import { SKILLS, SKILL_ORDER } from "@/lib/skills";
import { useLevel } from "@/lib/store/hooks";
import type { SkillId } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";

const CATS: Array<SkillId | "cooldown"> = ["breathing", "warmup", ...SKILL_ORDER.filter((s) => s !== "breathing")];

export default function ExercisesPage() {
  const level = useLevel();
  const [cat, setCat] = useState<SkillId | "all">("all");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return EXERCISES.filter((e) => (cat === "all" || e.category === cat) && (!query || e.name.toLowerCase().includes(query) || e.objective.toLowerCase().includes(query) || e.tags?.some((t) => t.includes(query))));
  }, [cat, q]);

  const grouped = useMemo(() => {
    const map = new Map<SkillId, typeof list>();
    for (const e of list) {
      if (!map.has(e.category)) map.set(e.category, []);
      map.get(e.category)!.push(e);
    }
    return [...map.entries()].sort((a, b) => CATS.indexOf(a[0]) - CATS.indexOf(b[0]));
  }, [list]);

  return (
    <div className="space-y-5">
      <div>
        <Eyebrow>Bibliothèque</Eyebrow>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Exercices</h1>
        <p className="mt-1 text-sm text-fg-muted">{EXERCISES.length} exercices en 9 catégories. Les exercices au-dessus de ton niveau restent consultables et faisables librement.</p>
      </div>

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher (legato, micro, souffle…)"
        className="h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm outline-none placeholder:text-fg-subtle focus:border-accent"
        aria-label="Rechercher un exercice"
      />

      <div className="-mx-4 overflow-x-auto scrollbar-none px-4">
        <div className="flex gap-1.5 w-max">
          <CatChip active={cat === "all"} onClick={() => setCat("all")} label="Tout" />
          {CATS.filter((c): c is SkillId => c !== "cooldown").map((c) => (
            <CatChip key={c} active={cat === c} onClick={() => setCat(c)} label={`${SKILLS[c].emoji} ${SKILLS[c].label}`} color={SKILLS[c].color} />
          ))}
        </div>
      </div>

      {grouped.length === 0 && <p className="text-sm text-fg-muted">Aucun exercice ne correspond.</p>}

      {grouped.map(([category, items]) => (
        <section key={category}>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-base font-semibold">
              {SKILLS[category].emoji} {SKILLS[category].label}
            </h2>
            <span className="text-xs text-fg-subtle">{SKILLS[category].description}</span>
          </div>
          <ul className="space-y-2">
            {items.map((e) => {
              const locked = e.level > level;
              return (
                <li key={e.id}>
                  <Link href={`/exercises/${e.id}`} className={cn("flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3 transition-colors hover:border-border-strong", locked && "opacity-75")}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{e.name}</span>
                        {e.cooldown && <Badge>Retour au calme</Badge>}
                        {e.interactive && <span className="text-xs" title="Exercice interactif">🎛️</span>}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-fg-subtle">{e.objective}</div>
                    </div>
                    <div className="shrink-0 text-right text-[11px] text-fg-subtle">
                      <div>Niv. {e.level}{locked ? " 🔒" : ""}</div>
                      <div className="font-mono">{formatDuration(e.duration)}</div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function CatChip({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn("rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors", active ? "border-accent bg-accent-soft text-accent-strong" : "border-border-strong text-fg-muted hover:text-fg")}
      style={active && color ? { borderColor: color, color, backgroundColor: `${color}22` } : undefined}
    >
      {label}
    </button>
  );
}
