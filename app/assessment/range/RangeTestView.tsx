"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { LevelMeter, MicLimits, MicNotice, usePitch } from "@/components/audio/common";
import { RangeChart } from "@/components/vocal/RangeChart";
import { Badge, Button, Callout, Card, Eyebrow, ProgressBar } from "@/components/ui";
import { getAudioEngine } from "@/lib/audio/engine";
import { foldCents, freqToMidi, midiToName } from "@/lib/audio/notes";
import {
  COMFORT_OPTIONS,
  PHASE_HINT,
  PHASE_TITLE,
  advanceRangeTest,
  beginRangeTest,
  createRangeTest,
  rangeTestProgress,
  shouldAskComfort,
  stopRangeTest,
  type RangeTestState,
} from "@/lib/assessment/rangeTest";
import { useAppStore } from "@/lib/store";
import { analyseVocalProfile, describeEstimate, formatBand, suggestedWorkingRange } from "@/lib/vocal/profile";
import { centerFor, partLabel } from "@/lib/vocal/voiceParts";
import { MIN_FRAME_CLARITY, MIN_FRAME_LEVEL, observationFrom, summarizeFrames, type Capture } from "@/lib/vocal/capture";
import type { Comfort, VocalObservation } from "@/lib/vocal/types";
import { cn } from "@/lib/utils";

/** Étapes de l'écran, distinctes des phases du test lui-même. */
type Stage = "intro" | "playing" | "listening" | "comfort" | "unclear" | "done";

/** Trames valides nécessaires pour conclure : environ une seconde de son tenu. */
const NEEDED_FRAMES = 45;
/** Au-delà, on renonce plutôt que de conclure sur trop peu. */
const LISTEN_TIMEOUT_MS = 7000;
const MIN_FRAMES_TO_CONCLUDE = 20;

export function RangeTestView() {
  const router = useRouter();
  const declaredPart = useAppStore((s) => s.profile.declaredPart);
  const storedLow = useAppStore((s) => s.profile.lowNote);
  const storedHigh = useAppStore((s) => s.profile.highNote);
  const addObservations = useAppStore((s) => s.addObservations);
  const applyWorkingRange = useAppStore((s) => s.applyWorkingRange);

  const [state, setState] = useState<RangeTestState>(() =>
    createRangeTest({ center: storedHigh > storedLow ? Math.round((storedLow + storedHigh) / 2) : centerFor(declaredPart) }),
  );
  const [stage, setStage] = useState<Stage>("intro");
  const [capture, setCapture] = useState<Capture | null>(null);
  const [micOn, setMicOn] = useState(false);
  const [heard, setHeard] = useState(false);
  const [saved, setSaved] = useState(false);

  const stageRef = useRef<Stage>("intro");
  const targetRef = useRef(state.target);
  const samplesRef = useRef<number[]>([]);
  const clarityRef = useRef<number[]>([]);
  const startedAtRef = useRef(0);
  const lastAtRef = useRef(0);
  const timerRef = useRef(0);

  const setStageBoth = (next: Stage) => {
    stageRef.current = next;
    setStage(next);
  };

  function finishListening(result: Capture | null) {
    window.clearTimeout(timerRef.current);
    if (!result) {
      setCapture(null);
      setStageBoth("unclear");
      return;
    }
    setCapture(result);
    // Le confort n'est demandé que pendant l'exploration ; ailleurs on enchaîne.
    if (shouldAskComfort(state)) setStageBoth("comfort");
    else submit(result, undefined);
  }

  const buildCapture = (): Capture | null =>
    summarizeFrames(samplesRef.current, clarityRef.current, (lastAtRef.current - startedAtRef.current) / 1000, MIN_FRAMES_TO_CONCLUDE);

  const { frame, status } = usePitch(micOn, (f) => {
    if (stageRef.current !== "listening") return;
    if (!f.frequency || f.clarity < MIN_FRAME_CLARITY || f.level < MIN_FRAME_LEVEL) return;
    if (samplesRef.current.length === 0) {
      startedAtRef.current = f.time;
      setHeard(true);
    }
    lastAtRef.current = f.time;
    samplesRef.current.push(freqToMidi(f.frequency));
    clarityRef.current.push(f.clarity);
    if (samplesRef.current.length >= NEEDED_FRAMES) finishListening(buildCapture());
  });

  const playTarget = (midi: number) => {
    getAudioEngine().play(midi, 1.6, "piano");
  };

  function askNote(next: RangeTestState) {
    window.clearTimeout(timerRef.current);
    targetRef.current = next.target;
    samplesRef.current = [];
    clarityRef.current = [];
    setHeard(false);
    setCapture(null);
    setStageBoth("playing");
    playTarget(next.target);
    timerRef.current = window.setTimeout(() => {
      setStageBoth("listening");
      timerRef.current = window.setTimeout(() => finishListening(buildCapture()), LISTEN_TIMEOUT_MS);
    }, 1700);
  }

  function submit(result: Capture | null, comfort?: Comfort) {
    const observation = observationFrom(targetRef.current, result, "range-test", comfort);
    const blocked = comfort === "impossible" || comfort === "strained";
    const next = advanceRangeTest(
      state,
      blocked ? { kind: "uncomfortable", observation } : result ? { kind: "sung", observation } : { kind: "unclear" },
    );
    setState(next);
    if (next.phase === "done") {
      setStageBoth("done");
      setMicOn(false);
    } else {
      askNote(next);
    }
  }

  const start = () => {
    setMicOn(true);
    const next = beginRangeTest(state);
    setState(next);
    askNote(next);
  };

  const abandon = () => {
    window.clearTimeout(timerRef.current);
    setState((s) => stopRangeTest(s));
    setMicOn(false);
    setStageBoth("done");
  };

  // ------------------------------------------------------------- affichage

  const target = state.target;
  const folded = capture ? foldCents((capture.detectedMidi - target) * 100) : null;
  const verdict = folded === null ? null : Math.abs(folded) <= 25 ? "ok" : folded < 0 ? "low" : "high";

  if (stage === "intro") {
    return (
      <div className="space-y-5">
        <div>
          <Eyebrow>Évaluation</Eyebrow>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Quelle est mon étendue vocale ?</h1>
          <p className="mt-2 text-sm text-fg-muted leading-relaxed">
            Ce test ne cherche pas à te faire atteindre ta note la plus aiguë ou la plus grave à tout prix. Il cherche à
            comprendre quelles zones de ta voix sont accessibles, fiables et confortables.
          </p>
        </div>

        <Card>
          <Eyebrow className="mb-3">Comment ça se passe</Eyebrow>
          <ol className="space-y-2 text-sm text-fg-muted">
            <li>1. Quelques notes au milieu de ta voix, pour établir un repère.</li>
            <li>2. On descend progressivement, puis on remonte, deux demi-tons à la fois.</li>
            <li>3. Après chaque note, tu dis si c&apos;était facile, correct, tendu ou impossible.</li>
            <li>4. Quelques notes sont redemandées pour confirmer : une réussite unique ne suffit pas.</li>
          </ol>
          <p className="mt-3 text-xs text-fg-subtle">
            Environ six minutes. Pupitre déclaré : {partLabel(declaredPart)} — il sert uniquement à choisir la note de départ.
          </p>
        </Card>

        <Callout tone="warning" title="On ne force jamais">
          Aucune note extrême n&apos;est un objectif. Dès que ça tire, choisis « Ça tire » ou « Impossible » : l&apos;exploration
          s&apos;arrête aussitôt dans cette direction, sans insister. Arrête complètement en cas de douleur, de raclement ou de
          fatigue vocale.
        </Callout>

        <Callout tone="info" title="Avant de commencer">
          Mets-toi dans une pièce calme, échauffe-toi une minute en fredonnant doucement, et bois une gorgée d&apos;eau. Le micro
          n&apos;enregistre rien : seule la hauteur estimée est conservée.
        </Callout>

        <Button size="xl" full onClick={start}>
          🎤 Commencer le test
        </Button>
      </div>
    );
  }

  if (stage === "done") {
    return <RangeTestResult state={state} onSave={addObservations} onApplyRange={applyWorkingRange} saved={saved} setSaved={setSaved} onLeave={() => router.push("/dashboard")} />;
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between gap-2">
          <Eyebrow>{PHASE_TITLE[state.phase]}</Eyebrow>
          <Badge>{Math.round(rangeTestProgress(state) * 100)} %</Badge>
        </div>
        <ProgressBar value={rangeTestProgress(state) * 100} className="mt-2" />
        <p className="mt-2 text-sm text-fg-muted">{PHASE_HINT[state.phase]}</p>
      </div>

      <MicNotice status={status} />

      <Card>
        <div className="flex flex-col items-center gap-5 py-2">
          <div className="text-center">
            <div className="text-[11px] uppercase tracking-[0.14em] text-fg-subtle">Note cible</div>
            <div className="font-mono text-5xl font-semibold tabular-nums">{midiToName(target)}</div>
          </div>

          <div
            className={cn(
              "flex h-24 w-full flex-col items-center justify-center rounded-2xl border text-center transition-colors",
              stage === "listening" ? "border-accent bg-accent-soft" : "border-border bg-surface-3",
            )}
          >
            {stage === "playing" && <span className="text-sm text-fg-muted">🔊 Écoute la note…</span>}
            {stage === "listening" && (
              <>
                <span className="text-sm font-medium text-accent-strong">Chante la note et tiens-la</span>
                <span className="mt-1 font-mono text-xs text-fg-subtle">{heard ? "son détecté…" : "en attente de ta voix"}</span>
              </>
            )}
            {stage === "comfort" && capture && (
              <>
                <div className="text-[11px] uppercase tracking-[0.14em] text-fg-subtle">Ta note détectée</div>
                <div className="font-mono text-2xl font-semibold tabular-nums">{midiToName(Math.round(capture.detectedMidi))}</div>
                <div className="mt-1 text-sm">
                  {verdict === "ok" && <span className="font-semibold text-success">✓ Stable</span>}
                  {verdict === "low" && <span className="font-semibold text-accent-strong">↓ Légèrement trop grave</span>}
                  {verdict === "high" && <span className="font-semibold text-accent-strong">↑ Légèrement trop aigu</span>}
                </div>
              </>
            )}
            {stage === "unclear" && <span className="text-sm text-fg-muted">Je n&apos;ai pas pu déterminer ta note de façon fiable.</span>}
          </div>

          {frame && <LevelMeter level={frame.level} />}

          {stage === "listening" && (
            <Button variant="secondary" size="sm" onClick={() => playTarget(target)}>
              🔁 Rejouer la note
            </Button>
          )}

          {stage === "comfort" && (
            <div className="w-full">
              <div className="mb-2 text-center text-sm text-fg-muted">Comment c&apos;était ?</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {COMFORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => submit(capture, option.value)}
                    className="flex flex-col items-center gap-1 rounded-xl border border-border-strong px-3 py-3 text-xs font-medium hover:border-accent hover:text-accent-strong"
                  >
                    <span className="text-xl">{option.emoji}</span>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {stage === "unclear" && (
            <div className="grid w-full gap-2 sm:grid-cols-2">
              <Button variant="secondary" full onClick={() => askNote(state)}>
                Réessayer cette note
              </Button>
              <Button full onClick={() => submit(null, undefined)}>
                Passer à la suivante →
              </Button>
              <p className="col-span-full text-center text-xs text-fg-subtle">
                Réessaie dans un environnement plus calme, ou passe : une note sautée ne fausse rien.
              </p>
            </div>
          )}
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => submit(null, "impossible")}>
          🚫 Je suis inconfortable
        </Button>
        <Button variant="ghost" onClick={abandon}>
          Arrêter le test
        </Button>
      </div>

      <MicLimits />
    </div>
  );
}

// ------------------------------------------------------------------ résultat

function RangeTestResult({
  state,
  onSave,
  onApplyRange,
  saved,
  setSaved,
  onLeave,
}: {
  state: RangeTestState;
  onSave: (observations: VocalObservation[]) => void;
  onApplyRange: (range: { low: number; high: number }) => void;
  saved: boolean;
  setSaved: (v: boolean) => void;
  onLeave: () => void;
}) {
  // L'analyse porte sur les observations du test seul, avant enregistrement :
  // l'utilisateur voit ce que cette séance a produit, puis décide de le garder.
  const analysis = analyseVocalProfile(state.observations);
  const estimate = describeEstimate(analysis);
  const suggestion = suggestedWorkingRange(analysis);

  const save = () => {
    onSave(state.observations);
    if (suggestion) onApplyRange(suggestion);
    setSaved(true);
  };

  return (
    <div className="space-y-5">
      <div>
        <Eyebrow>Résultat</Eyebrow>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Ton profil vocal actuel</h1>
        <p className="mt-2 text-sm text-fg-muted">
          {state.observations.length} tentatives enregistrées pendant ce test.
          {state.stoppedEarly && " L'exploration s'est arrêtée sur une gêne déclarée, ce qui est exactement ce qu'il fallait faire."}
        </p>
      </div>

      {analysis.explored ? (
        <Card>
          <RangeChart
            explored={analysis.explored}
            reliable={analysis.reliable}
            comfortable={analysis.comfortable}
            central={analysis.central}
            transitions={analysis.transitions}
          />
        </Card>
      ) : (
        <Callout tone="warning" title="Trop peu de notes exploitables">
          Le micro n&apos;a pas réussi à suivre ta voix. Réessaie dans un endroit plus calme, plus près du micro, en tenant chaque
          note deux bonnes secondes.
        </Callout>
      )}

      <Card>
        <Eyebrow className="mb-2">Estimation</Eyebrow>
        <p className="text-base font-semibold">{estimate.headline}</p>
        <p className="mt-1 text-sm text-fg-muted leading-relaxed">{estimate.detail}</p>
        {estimate.caveat && <p className="mt-2 text-xs text-fg-subtle">{estimate.caveat}</p>}
      </Card>

      {(analysis.pitchAccuracy !== null || analysis.pitchStability !== null) && (
        <Card>
          <Eyebrow className="mb-3">Ce qui a été mesuré</Eyebrow>
          <div className="grid gap-3 sm:grid-cols-2">
            {analysis.pitchAccuracy !== null && (
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-fg-muted">Justesse</span>
                  <span className="font-mono tabular-nums">{Math.round(analysis.pitchAccuracy * 100)}%</span>
                </div>
                <ProgressBar value={analysis.pitchAccuracy * 100} height={6} color="#a78bfa" />
              </div>
            )}
            {analysis.pitchStability !== null && (
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-fg-muted">Stabilité</span>
                  <span className="font-mono tabular-nums">{Math.round(analysis.pitchStability * 100)}%</span>
                </div>
                <ProgressBar value={analysis.pitchStability * 100} height={6} color="#34d399" />
              </div>
            )}
          </div>
          <p className="mt-3 text-[11px] text-fg-subtle">
            Ces valeurs viennent d&apos;une estimation de hauteur par le micro. Elles situent une tendance ; ce ne sont pas des
            mesures de laboratoire.
          </p>
        </Card>
      )}

      {saved ? (
        <Callout tone="success" title="Enregistré">
          Tes observations rejoignent ton profil vocal. Il se précisera à chaque test et à chaque exercice au micro.
          {suggestion && ` Ta zone de travail est désormais ${formatBand(suggestion)}.`}
        </Callout>
      ) : (
        <div className="grid gap-2">
          <Button size="xl" full onClick={save} disabled={state.observations.length === 0}>
            Enregistrer dans mon profil
          </Button>
          <p className="text-center text-xs text-fg-subtle">
            {suggestion
              ? `Ta zone de travail passera à ${formatBand(suggestion)}, ce qui adaptera les tonalités de tes exercices.`
              : "Les données de ce test sont trop minces pour ajuster ta zone de travail, mais elles enrichiront ton profil."}
          </p>
        </div>
      )}

      <Button variant="secondary" size="xl" full onClick={onLeave}>
        Retour au tableau de bord
      </Button>
    </div>
  );
}
