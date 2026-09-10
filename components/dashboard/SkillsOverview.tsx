"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Badge, ProgressBar } from "@/components/ui";
import { MEASURED_SKILL_IDS, describeMeasured, describeTrend, measureSkills, practiceOf, type MeasuredSkill, type MeasuredSkillId, type SkillPractice } from "@/lib/progression";
import { summarizeFeedback } from "@/lib/routine/generator";
import { SKILLS, SKILL_ORDER } from "@/lib/skills";
import { useAppStore } from "@/lib/store";
import type { SkillId } from "@/lib/types";
import { cn, formatDayKey, formatDuration } from "@/lib/utils";
import { DATA_CONFIDENCE_LABEL } from "@/lib/vocal/estimation";

/** Exercice à proposer pour obtenir une première mesure. */
const MEASURE_WITH: Record<MeasuredSkillId, { href: string; label: string }> = {
  pitch: { href: "/exercises/pitch-match-low", label: "Trouve la note" },
  stability: { href: "/exercises/stab-sustain-5", label: "Note droite" },
};

/**
 * Vue des compétences, en deux natures qu'on ne mélange pas.
 *
 * En haut, ce que le micro mesure : deux valeurs 0–100 qui montent et
 * descendent, avec leur grandeur musicale, leur tendance et leur fiabilité —
 * ou « données insuffisantes ». En bas, ce qui a été pratiqué : un décompte et
 * le ressenti déclaré, sans note de maîtrise, parce que rien ne la mesure.
 */
export function SkillsOverview({ compact = false }: { compact?: boolean }) {
  const observations = useAppStore((s) => s.observations);
  const skills = useAppStore((s) => s.skills);
  const sessions = useAppStore((s) => s.sessions);
  const measured = useMemo(() => measureSkills(observations), [observations]);
  const practice = useMemo(() => practiceOf(skills, sessions), [skills, sessions]);

  return (
    <div className="space-y-5">
      <section>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold">Mesuré au micro</h3>
          <span className="text-[11px] text-fg-subtle">monte et descend</span>
        </div>
        <div className={cn("grid gap-3", !compact && "sm:grid-cols-2")}>
          {MEASURED_SKILL_IDS.map((id) => (
            <MeasuredRow key={id} skill={measured[id]} compact={compact} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold">Pratiqué</h3>
          <span className="text-[11px] text-fg-subtle">compté · ressenti déclaré</span>
        </div>
        <ul className="divide-y divide-border">
          {SKILL_ORDER.map((id) => (
            <PracticeRow key={id} id={id} practice={practice[id]} compact={compact} />
          ))}
        </ul>
        {!compact && (
          <p className="mt-3 text-xs text-fg-subtle">
            Rien ici ne dit si une compétence est acquise : le décompte ne fait que monter, et le ressenti est ce que tu as
            déclaré après chaque exercice. Seules la justesse et la stabilité se mesurent.
          </p>
        )}
      </section>
    </div>
  );
}

function MeasuredRow({ skill, compact }: { skill: MeasuredSkill; compact: boolean }) {
  const meta = SKILLS[skill.id];
  const trend = describeTrend(skill);
  const title = (
    <span className="flex items-center gap-2">
      <span aria-hidden>{meta.emoji}</span>
      <span className="font-medium">{meta.label}</span>
    </span>
  );

  if (skill.value === null) {
    return (
      <div className="rounded-xl border border-dashed border-border p-3">
        <div className="flex items-center justify-between gap-2 text-sm">
          {title}
          <Badge>Données insuffisantes</Badge>
        </div>
        <p className="mt-1.5 text-xs text-fg-muted">{describeMeasured(skill)}</p>
        <Link href={MEASURE_WITH[skill.id].href} className="mt-1.5 inline-block text-xs text-accent-strong underline-offset-2 hover:underline">
          Mesurer avec « {MEASURE_WITH[skill.id].label} » →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        {title}
        <span className="flex items-center gap-2">
          {trend && (
            <span className={cn("text-xs", trend.direction === "up" ? "text-success" : trend.direction === "down" ? "text-warning" : "text-fg-subtle")}>
              {trend.direction === "up" ? "↗" : trend.direction === "down" ? "↘" : "→"} {trend.text}
            </span>
          )}
          <span className="font-mono text-lg font-semibold tabular-nums">{skill.value}</span>
        </span>
      </div>
      <ProgressBar value={skill.value} color={meta.color} height={compact ? 6 : 8} label={`${meta.label} mesurée`} className="mt-2" />
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-fg-muted">
        <span>{describeMeasured(skill)}</span>
        <span className="text-fg-subtle">
          {skill.samples} mesures · {DATA_CONFIDENCE_LABEL[skill.confidence]}
        </span>
      </div>
    </div>
  );
}

function PracticeRow({ id, practice, compact }: { id: SkillId; practice: SkillPractice; compact: boolean }) {
  const meta = SKILLS[id];
  return (
    <li className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <span aria-hidden>{meta.emoji}</span>
        <span className="font-medium">{meta.label}</span>
      </span>
      <span className="text-right text-xs text-fg-muted tabular-nums">
        {practice.exercises === 0 ? (
          <span className="text-fg-subtle">pas encore travaillée</span>
        ) : (
          <>
            {practice.exercises} ex. · {formatDuration(practice.seconds)}
            {!compact && practice.lastDate && <> · dernier {formatDayKey(practice.lastDate, { day: "numeric", month: "short" })}</>}
            {practice.feedback.length > 0 && <> · {summarizeFeedback(practice.feedback).toLowerCase()}</>}
          </>
        )}
      </span>
    </li>
  );
}
