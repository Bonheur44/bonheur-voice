"use client";

import Link from "next/link";
import { Badge, Button, Callout, Card, Eyebrow, ProgressBar } from "@/components/ui";
import { RangeChart } from "./RangeChart";
import { useVocalAnalysis } from "./useVocalAnalysis";
import { midiToName } from "@/lib/audio/notes";
import { useAppStore } from "@/lib/store";
import { DATA_CONFIDENCE_LABEL } from "@/lib/vocal/estimation";
import { describeEstimate, formatBand, nextStepAdvice, suggestedWorkingRange } from "@/lib/vocal/profile";
import { VOICE_PARTS, partLabel } from "@/lib/vocal/voiceParts";
import type { VocalAnalysis } from "@/lib/vocal/types";

const CONFIDENCE_RATIO: Record<VocalAnalysis["dataConfidence"], number> = {
  insufficient: 0.1,
  low: 0.35,
  moderate: 0.65,
  good: 1,
};

/** Carte « Ton profil vocal », utilisable au tableau de bord comme sur la page de progression. */
export function VocalProfileCard({ compact = false }: { compact?: boolean }) {
  const analysis = useVocalAnalysis();
  const declaredPart = useAppStore((s) => s.profile.declaredPart);
  const lowNote = useAppStore((s) => s.profile.lowNote);
  const highNote = useAppStore((s) => s.profile.highNote);
  const applyWorkingRange = useAppStore((s) => s.applyWorkingRange);

  const estimate = describeEstimate(analysis);
  const suggestion = suggestedWorkingRange(analysis);
  const differs = suggestion && (suggestion.low !== lowNote || suggestion.high !== highNote);
  const top = analysis.estimatedParts[0];

  if (analysis.dataConfidence === "insufficient") {
    return (
      <Card>
        <Eyebrow className="mb-2">Ton profil vocal</Eyebrow>
        <p className="text-sm font-medium">{estimate.headline}</p>
        <p className="mt-1 text-sm text-fg-muted">{estimate.detail}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
          <span>Pupitre déclaré : {partLabel(declaredPart)}</span>
          <span aria-hidden>·</span>
          <span className="font-mono">
            Zone de travail {midiToName(lowNote)} → {midiToName(highNote)}
          </span>
        </div>
        <div className="mt-4">
          <Link href="/assessment/range">
            <Button full>🎤 Évaluer ma voix</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <Eyebrow className="mb-1">Ton profil vocal estimé</Eyebrow>
          <p className="text-base font-semibold">{estimate.headline}</p>
        </div>
        <Badge>{DATA_CONFIDENCE_LABEL[analysis.dataConfidence]}</Badge>
      </div>

      <p className="text-sm text-fg-muted leading-relaxed">{estimate.detail}</p>
      {estimate.caveat && <p className="mt-2 text-xs text-fg-subtle">{estimate.caveat}</p>}

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-fg-subtle">
          <span>Fiabilité des données</span>
          <span>
            {analysis.attempts} tentatives · {analysis.distinctNotes} notes
          </span>
        </div>
        <ProgressBar value={CONFIDENCE_RATIO[analysis.dataConfidence] * 100} />
      </div>

      {!compact && (
        <>
          <div className="mt-5">
            <RangeChart
              explored={analysis.explored}
              reliable={analysis.reliable}
              comfortable={analysis.comfortable}
              central={analysis.central}
              transitions={analysis.transitions}
            />
          </div>

          {analysis.estimatedParts.length > 1 && (
            <div className="mt-5">
              <Eyebrow className="mb-2">Compatibilité par pupitre</Eyebrow>
              <ul className="space-y-1.5">
                {analysis.estimatedParts
                  .filter((e) => e.confidence >= 0.02)
                  .map((e) => (
                    <li key={e.part} className="flex items-center gap-3 text-sm">
                      <span className={e.part === top?.part ? "w-32 font-medium" : "w-32 text-fg-muted"}>{VOICE_PARTS[e.part].label}</span>
                      <div className="flex-1">
                        <ProgressBar value={e.confidence * 100} height={6} />
                      </div>
                      <span className="w-10 text-right font-mono text-xs tabular-nums text-fg-subtle">
                        {Math.round(e.confidence * 100)}%
                      </span>
                    </li>
                  ))}
              </ul>
              <p className="mt-2 text-[11px] text-fg-subtle">
                Ce sont des parts relatives entre les sept pupitres, pas des probabilités. Les pupitres voisins se recouvrent
                largement : un partage est souvent la réponse la plus juste.
              </p>
            </div>
          )}

          {(analysis.pitchAccuracy !== null || analysis.pitchStability !== null) && (
            <div className="mt-5 grid grid-cols-2 gap-3">
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
          )}
        </>
      )}

      {differs && suggestion && (
        <Callout tone="info" title="Ajuster ta zone de travail ?" className="mt-4">
          <p>
            Les exercices utilisent actuellement {midiToName(lowNote)} → {midiToName(highNote)}. Tes observations suggèrent{" "}
            {formatBand(suggestion)}.
          </p>
          <div className="mt-2">
            <Button size="sm" onClick={() => applyWorkingRange(suggestion)}>
              Utiliser {formatBand(suggestion)}
            </Button>
          </div>
        </Callout>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
        <span>Pupitre déclaré : {partLabel(declaredPart)}</span>
        {top && declaredPart !== "unknown" && top.part !== declaredPart && !analysis.ambiguous && (
          <Badge color="#fbbf24">à confronter avec l&apos;estimation</Badge>
        )}
      </div>

      <p className="mt-3 text-xs text-fg-subtle">{nextStepAdvice(analysis)}</p>

      <div className="mt-4 flex gap-2">
        <Link href="/assessment/range" className="flex-1">
          <Button variant="secondary" full>
            Refaire le test
          </Button>
        </Link>
        <Link href="/assessment" className="flex-1">
          <Button variant="secondary" full>
            Toutes les évaluations
          </Button>
        </Link>
      </div>
    </Card>
  );
}

/**
 * Message de confrontation entre pupitre déclaré et estimation.
 * Formulé comme une invitation à vérifier, jamais comme une correction.
 */
export function DeclaredVsEstimated() {
  const analysis = useVocalAnalysis();
  const declaredPart = useAppStore((s) => s.profile.declaredPart);
  const top = analysis.estimatedParts[0];

  if (!top || analysis.dataConfidence === "insufficient" || declaredPart === "unknown") return null;
  if (top.part === declaredPart || analysis.ambiguous) return null;
  // Une estimation trop peu marquée ne justifie pas d'interpeller l'utilisateur.
  if (top.confidence < 0.35) return null;

  return (
    <Callout tone="info" title="Une remarque, sans conclusion">
      Tu chantes actuellement {partLabel(declaredPart).toLowerCase()}, mais les données recueillies indiquent que ta zone
      confortable ({formatBand(analysis.comfortable)}) se rapproche davantage de {VOICE_PARTS[top.part].label.toLowerCase()}.
      Cela ne veut pas dire que tu es dans le mauvais pupitre : le placement dépend aussi du timbre, de l&apos;endurance et des
      besoins du chœur. Continue les tests, et demande confirmation à ton chef de chœur ou à un professeur de chant.
    </Callout>
  );
}
