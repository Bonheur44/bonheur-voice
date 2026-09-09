"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Callout, Card, Eyebrow, LinkButton, ProgressBar } from "@/components/ui";
import { ExerciseBody, ExerciseHeader } from "./ExerciseDetail";
import { FeedbackPicker } from "./FeedbackPicker";
import { InteractiveWidget } from "./InteractiveWidget";
import { SessionPlan } from "@/components/routine/SessionPlan";
import { getExercise } from "@/data/exercises";
import { usePersonalizedExercise } from "./usePersonalized";
import { getAudioEngine } from "@/lib/audio/engine";
import { ACHIEVEMENTS } from "@/lib/progression";
import { FEEDBACK_LABELS, SKILLS } from "@/lib/skills";
import { useAppStore } from "@/lib/store";
import type { Feedback, Session, SkillId } from "@/lib/types";
import { cn, formatClock, formatDuration } from "@/lib/utils";

type Phase = "intro" | "running" | "feedback" | "done";

export function ExercisePlayer({ session }: { session: Session }) {
  const router = useRouter();
  const startSession = useAppStore((s) => s.startSession);
  const recordExercise = useAppStore((s) => s.recordExercise);
  const finishSession = useAppStore((s) => s.finishSession);
  const skillsNow = useAppStore((s) => s.skills);
  const achievementsNow = useAppStore((s) => s.achievements);

  const firstPending = Math.max(0, session.exercises.findIndex((e) => !e.completed && !e.skipped));
  const [index, setIndex] = useState(firstPending === -1 ? 0 : firstPending);
  const [phase, setPhase] = useState<Phase>("intro");
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reps, setReps] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [finished, setFinished] = useState<Session | null>(null);
  const [showPlan, setShowPlan] = useState(false);
  const [skillsAtStart] = useState(() => skillsNow);
  const [achievementsAtStart] = useState(() => achievementsNow.length);
  const elapsedRef = useRef(0);
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);

  const se = session.exercises[index];
  const exercise = usePersonalizedExercise(se ? getExercise(se.exerciseId) : undefined);
  const total = session.exercises.length;
  const planned = se?.plannedDuration ?? 0;
  const remaining = Math.max(0, planned - elapsed);

  // Timer (avec fin automatique et carillon)
  useEffect(() => {
    if (phase !== "running" || paused) return;
    const id = window.setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
      if (planned > 0 && elapsedRef.current >= planned) {
        try {
          const eng = getAudioEngine();
          const t = eng.now;
          eng.play(76, 0.25, "piano", t, 0.5);
          eng.play(83, 0.5, "piano", t + 0.25, 0.5);
        } catch {
          /* audio non disponible */
        }
        setPhase("feedback");
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, paused, planned]);

  // Wake lock pendant l'exercice
  useEffect(() => {
    if (phase !== "running") {
      void wakeLock.current?.release();
      wakeLock.current = null;
      return;
    }
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock
      ?.request("screen")
      .then((l) => {
        wakeLock.current = l;
      })
      .catch(() => {});
    return () => {
      void wakeLock.current?.release();
      wakeLock.current = null;
    };
  }, [phase]);

  const begin = () => {
    startSession();
    elapsedRef.current = 0;
    setElapsed(0);
    setReps(0);
    setPaused(false);
    setFeedback(null);
    setPhase("running");
    try {
      getAudioEngine().ensure();
    } catch {
      /* ignore */
    }
  };

  const goTo = useCallback(
    (i: number) => {
      setIndex(i);
      setPhase("intro");
      setPaused(false);
      setFeedback(null);
      elapsedRef.current = 0;
      setElapsed(0);
      setReps(0);
      window.scrollTo({ top: 0 });
    },
    [],
  );

  const completeAndNext = (fb: Feedback) => {
    recordExercise(index, { feedback: fb, actualDuration: elapsedRef.current });
    advance();
  };

  const skip = () => {
    recordExercise(index, { skipped: true, actualDuration: elapsedRef.current });
    advance();
  };

  const advance = () => {
    if (index + 1 >= total) {
      const done = finishSession();
      setFinished(done);
      setPhase("done");
      window.scrollTo({ top: 0 });
    } else {
      goTo(index + 1);
    }
  };

  const progress = useMemo(() => ((index + (phase === "feedback" ? 1 : phase === "running" ? Math.min(1, elapsed / Math.max(1, planned)) : 0)) / total) * 100, [index, phase, elapsed, planned, total]);

  if (phase === "done") {
    return <SessionSummary session={finished ?? session} skillsBefore={skillsAtStart} skillsAfter={skillsNow} newAchievements={achievementsNow.slice(achievementsAtStart)} />;
  }

  if (!exercise || !se) {
    return (
      <div className="p-6">
        <Callout tone="warning">Exercice introuvable.</Callout>
        <LinkButton href="/routine" className="mt-4">Retour</LinkButton>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Barre de progression de séance */}
      <div className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <button onClick={() => router.push("/routine")} className="rounded-lg p-2 text-fg-muted hover:bg-surface-2 hover:text-fg" aria-label="Quitter la séance">
            ✕
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between text-[11px] text-fg-subtle">
              <span>
                Exercice {index + 1} / {total}
              </span>
              <button onClick={() => setShowPlan((v) => !v)} className="underline-offset-2 hover:underline">
                {showPlan ? "Masquer le plan" : "Voir le plan"}
              </button>
            </div>
            <ProgressBar value={progress} height={5} className="mt-1" label="Progression de la séance" />
          </div>
        </div>
        {showPlan && (
          <div className="mx-auto max-w-3xl px-4 pb-3">
            <SessionPlan session={session} compact currentIndex={index} />
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 pb-36 animate-rise" key={`${index}-${phase}`}>
        {phase === "intro" && (
          <div className="space-y-6">
            <ExerciseHeader exercise={exercise} plannedDuration={se.plannedDuration} />
            <ExerciseBody exercise={exercise} />
            {exercise.interactive && (
              <Callout tone="info">
                Cet exercice utilise un outil interactif ({widgetLabel(exercise.interactive.type)}). Il apparaîtra au démarrage. Le son se lance au premier clic.
              </Callout>
            )}
          </div>
        )}

        {phase === "running" && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Eyebrow>{exercise.cooldown ? "Retour au calme" : SKILLS[exercise.category].label}</Eyebrow>
                <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{exercise.name}</h1>
              </div>
              <Link href={`/exercises/${exercise.id}`} className="shrink-0 text-xs text-fg-muted underline-offset-2 hover:underline" target="_blank">
                Fiche complète ↗
              </Link>
            </div>

            {/* Timer */}
            <Card className={cn("flex items-center justify-between gap-4", paused && "opacity-80")}>
              <div>
                <Eyebrow>{paused ? "En pause" : "Temps restant"}</Eyebrow>
                <div data-testid="timer" className={cn("font-mono text-5xl font-semibold tabular-nums tracking-tight", remaining <= 10 && !paused && "text-accent-strong")}>{formatClock(remaining)}</div>
                <div className="mt-1 text-xs text-fg-subtle">sur {formatDuration(planned)}</div>
              </div>
              <TimerRing value={planned > 0 ? elapsed / planned : 0} paused={paused} />
            </Card>

            {/* Répétitions */}
            {exercise.repetitions && (
              <Card className="flex items-center justify-between">
                <div>
                  <Eyebrow>Répétitions</Eyebrow>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">
                    {reps} <span className="text-base text-fg-subtle">/ {exercise.repetitions}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="md" onClick={() => setReps((r) => Math.max(0, r - 1))} aria-label="Retirer une répétition">−</Button>
                  <Button variant={reps >= exercise.repetitions ? "secondary" : "primary"} size="md" onClick={() => setReps((r) => r + 1)} aria-label="Ajouter une répétition">
                    + 1
                  </Button>
                </div>
              </Card>
            )}

            {exercise.interactive && <InteractiveWidget spec={exercise.interactive} running={!paused} />}

            {/* Rappel des consignes */}
            <details className="rounded-2xl border border-border bg-surface p-4" open={!exercise.interactive}>
              <summary className="cursor-pointer text-sm font-semibold">Consignes</summary>
              <ol className="mt-3 space-y-2 text-sm text-fg-muted">
                {exercise.instructions.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-accent-strong font-semibold">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-3 rounded-xl bg-surface-2 p-3 text-xs text-fg-muted">
                <span className="font-semibold text-fg">À surveiller : </span>
                {exercise.focusPoints.join(" · ")}
              </div>
            </details>
          </div>
        )}

        {phase === "feedback" && (
          <div className="space-y-6">
            <div className="text-center">
              <Eyebrow>Exercice terminé</Eyebrow>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">Comment s&apos;est passé l&apos;exercice ?</h1>
              <p className="mt-2 text-sm text-fg-muted">
                {exercise.name} · {formatDuration(elapsed)}
                {exercise.repetitions ? ` · ${reps} répétition${reps > 1 ? "s" : ""}` : ""}
              </p>
            </div>
            <FeedbackPicker value={feedback} onChange={setFeedback} />
            {feedback && (
              <Callout tone={feedback <= 2 ? "warning" : feedback >= 4 ? "success" : "info"}>
                {feedback <= 2 && "C'est noté : la difficulté de cette compétence sera allégée dans les prochaines séances. Une difficulté ressentie n'est pas un échec, c'est une information."}
                {feedback === 3 && "Parfait, c'est exactement la zone de progrès : ni trop facile, ni trop dur."}
                {feedback >= 4 && "Bien. Si c'est régulièrement facile, la difficulté montera d'un cran."}
              </Callout>
            )}
          </div>
        )}
      </div>

      {/* Barre d'actions */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-bg-elevated/95 backdrop-blur safe-bottom">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          {phase === "intro" && (
            <>
              <Button variant="ghost" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Exercice précédent">
                ← Préc.
              </Button>
              <Button size="xl" full onClick={begin} className="flex-1">
                ▶ Commencer
              </Button>
              <Button variant="ghost" onClick={skip} aria-label="Passer cet exercice">
                Passer →
              </Button>
            </>
          )}
          {phase === "running" && (
            <>
              <Button variant="ghost" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Exercice précédent">
                ←
              </Button>
              <Button variant="secondary" size="lg" onClick={() => setPaused((p) => !p)} className="flex-1" aria-pressed={paused}>
                {paused ? "▶ Reprendre" : "❚❚ Pause"}
              </Button>
              <Button size="lg" onClick={() => setPhase("feedback")} className="flex-1">
                Terminer ✓
              </Button>
              <Button variant="ghost" onClick={skip} aria-label="Passer cet exercice">
                →
              </Button>
            </>
          )}
          {phase === "feedback" && (
            <>
              <Button variant="ghost" onClick={() => setPhase("running")} aria-label="Reprendre l'exercice">
                ← Reprendre
              </Button>
              <Button size="xl" full disabled={!feedback} onClick={() => feedback && completeAndNext(feedback)} className="flex-1">
                {index + 1 >= total ? "Terminer la séance 🎉" : "Exercice suivant →"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function widgetLabel(type: string): string {
  const map: Record<string, string> = {
    breathing: "guide respiratoire",
    metronome: "métronome",
    drone: "bourdon",
    "pitch-match": "trouve la note, avec micro",
    compare: "comparaison de hauteurs",
    sustain: "mesure de stabilité, avec micro",
    interval: "entraîneur d'intervalles",
    scale: "lecteur de gammes",
    melody: "apprentissage de mélodie",
    choir: "mode chorale",
    piano: "piano",
  };
  return map[type] ?? type;
}

function TimerRing({ value, paused }: { value: number; paused: boolean }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg width={88} height={88} viewBox="0 0 88 88" className={cn(paused && "animate-pulse-soft")} aria-hidden>
      <circle cx={44} cy={44} r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth={7} />
      <circle cx={44} cy={44} r={r} fill="none" stroke="var(--color-accent)" strokeWidth={7} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, value))} transform="rotate(-90 44 44)" style={{ transition: "stroke-dashoffset 1s linear" }} />
    </svg>
  );
}

function SessionSummary({ session, skillsBefore, skillsAfter, newAchievements }: { session: Session; skillsBefore: Record<SkillId, { score: number }>; skillsAfter: Record<SkillId, { score: number }>; newAchievements: Array<{ id: string }> }) {
  const done = session.exercises.filter((e) => e.completed);
  const gains = (Object.keys(skillsAfter) as SkillId[])
    .map((id) => ({ id, delta: skillsAfter[id].score - skillsBefore[id].score }))
    .filter((g) => g.delta > 0.05)
    .sort((a, b) => b.delta - a.delta);
  const avgFb = done.filter((e) => e.feedback).reduce((a, e) => a + (e.feedback ?? 0), 0) / Math.max(1, done.filter((e) => e.feedback).length);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 animate-rise space-y-6">
      <div className="text-center">
        <div className="text-5xl">🎉</div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Séance terminée</h1>
        <p className="mt-2 text-fg-muted">
          {formatDuration(session.totalDuration)} d&apos;entraînement · {done.length} exercice{done.length > 1 ? "s" : ""} sur {session.exercises.length}
        </p>
      </div>

      {gains.length > 0 && (
        <Card>
          <Eyebrow className="mb-3">Progression</Eyebrow>
          <div className="space-y-2">
            {gains.map((g) => (
              <div key={g.id} className="flex items-center justify-between text-sm">
                <span>
                  {SKILLS[g.id].emoji} {SKILLS[g.id].label}
                </span>
                <span className="font-mono text-success">+{g.delta.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {newAchievements.length > 0 && (
        <Card glow>
          <Eyebrow className="mb-3">Objectifs atteints</Eyebrow>
          <div className="flex flex-wrap gap-2">
            {newAchievements.map((a) => {
              const def = ACHIEVEMENTS.find((d) => d.id === a.id);
              return (
                <span key={a.id} className="rounded-full bg-accent-soft px-3 py-1 text-sm text-accent-strong">
                  {def?.emoji} {def?.title}
                </span>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        <Eyebrow className="mb-3">Exercices</Eyebrow>
        <ul className="space-y-2 text-sm">
          {session.exercises.map((e, i) => {
            const ex = getExercise(e.exerciseId);
            return (
              <li key={i} className="flex items-center justify-between gap-3">
                <span className={cn("truncate", e.skipped && "text-fg-subtle line-through")}>{ex?.name}</span>
                <span className="shrink-0 text-fg-muted">
                  {e.feedback ? `${FEEDBACK_LABELS[e.feedback].emoji} ${FEEDBACK_LABELS[e.feedback].label}` : e.skipped ? "passé" : "—"}
                </span>
              </li>
            );
          })}
        </ul>
        {done.length > 0 && <p className="mt-3 text-xs text-fg-subtle">Ressenti moyen : {avgFb.toFixed(1)} / 5</p>}
      </Card>

      <Callout tone="info" title="Après la séance">
        Bois de l&apos;eau, parle normalement. Si tu sens un raclement ou une fatigue inhabituelle, repos vocal jusqu&apos;à demain.
      </Callout>

      <div className="flex flex-col gap-2 sm:flex-row">
        <LinkButton href="/dashboard" size="lg" full>Retour à l&apos;accueil</LinkButton>
        <LinkButton href="/progression" size="lg" variant="secondary" full>Voir ma progression</LinkButton>
      </div>
    </div>
  );
}
