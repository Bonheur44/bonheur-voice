"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/layout/Logo";
import { Button, Callout, Card, Eyebrow, Segmented } from "@/components/ui";
import { DURATION_OPTIONS } from "@/components/routine/SessionPlan";
import { midiToName } from "@/lib/audio/notes";
import { SKILLS, SKILL_ORDER } from "@/lib/skills";
import { useAppStore } from "@/lib/store";
import { DECLARED_PART_OPTIONS, defaultLineFor, defaultRangeFor, partLabel } from "@/lib/vocal/voiceParts";
import type { DeclaredPart } from "@/lib/vocal/types";
import { cn } from "@/lib/utils";

const STEPS = 4;

export default function OnboardingPage() {
  const router = useRouter();
  const complete = useAppStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [inChoir, setInChoir] = useState<boolean | null>(null);
  const [part, setPart] = useState<DeclaredPart>("unknown");
  const [duration, setDuration] = useState(20 * 60);

  const range = defaultRangeFor(part);

  const finish = (assessNow: boolean) => {
    complete({
      declaredPart: part,
      choirLine: defaultLineFor(part),
      lowNote: range.low,
      highNote: range.high,
      rangeFromAssessment: false,
      preferredDuration: duration,
    });
    router.replace(assessNow ? "/assessment/range" : "/dashboard");
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12 animate-rise">
      <div className="mb-8 flex items-center gap-3">
        <Logo />
        <div>
          <div className="font-semibold">Vocal Training</div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-fg-subtle">Coach vocal choral</div>
        </div>
      </div>

      <div className="mb-6 flex gap-1.5">
        {Array.from({ length: STEPS }).map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-surface-3"}`} />
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-5">
          <Eyebrow>Bienvenue</Eyebrow>
          <h1 className="text-3xl font-semibold tracking-tight">Un coach vocal qui s&apos;adapte à ta voix, pas à une étiquette.</h1>
          <p className="text-fg-muted leading-relaxed">
            Chaque jour, une séance courte et progressive : respiration, note droite, justesse, articulation, registres, mémoire de ta ligne et indépendance face aux autres voix. Tu dis comment ça s&apos;est passé, la routine s&apos;adapte.
          </p>
          <Card>
            <Eyebrow className="mb-3">Ce que tu vas travailler</Eyebrow>
            <div className="grid grid-cols-2 gap-2">
              {SKILL_ORDER.map((id) => (
                <div key={id} className="flex items-center gap-2 text-sm">
                  <span>{SKILLS[id].emoji}</span>
                  <span>{SKILLS[id].label}</span>
                </div>
              ))}
            </div>
          </Card>
          <Callout tone="warning" title="Une règle avant tout">
            On ne force jamais. Volume doux ou moyen, jamais de douleur, jamais de raclement. Cette application n&apos;est pas un diagnostic médical.
          </Callout>
          <Button size="xl" full onClick={() => setStep(1)}>
            Continuer →
          </Button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <Eyebrow>Étape 2 / {STEPS}</Eyebrow>
          <h1 className="text-2xl font-semibold tracking-tight">Où en es-tu ?</h1>

          <Card>
            <div className="mb-3 text-sm font-medium">Chantes-tu actuellement dans une chorale ?</div>
            <Segmented
              options={[
                { value: "yes", label: "Oui" },
                { value: "no", label: "Pas encore" },
              ]}
              value={inChoir === null ? "" : inChoir ? "yes" : "no"}
              onChange={(v) => setInChoir(v === "yes")}
            />
          </Card>

          <Card>
            <div className="mb-1 text-sm font-medium">Quel est ton pupitre actuel ?</div>
            <p className="mb-3 text-xs text-fg-subtle">
              Cette réponse sert seulement à choisir un point de départ. Elle n&apos;est pas une conclusion sur ta voix : c&apos;est l&apos;évaluation qui s&apos;en chargera, et tu pourras la changer à tout moment.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DECLARED_PART_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPart(option.value)}
                  aria-pressed={part === option.value}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                    part === option.value
                      ? "border-accent bg-accent-soft text-accent-strong"
                      : "border-border-strong text-fg-muted hover:text-fg",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-fg-subtle">
              Point de départ retenu : {midiToName(range.low)} → {midiToName(range.high)}.
              {part === "unknown" && " Une zone médiane, en attendant l'évaluation."}
            </p>
          </Card>

          <div className="flex gap-2">
            <Button variant="secondary" size="xl" onClick={() => setStep(0)}>←</Button>
            <Button size="xl" full onClick={() => setStep(2)}>Continuer →</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <Eyebrow>Étape 3 / {STEPS}</Eyebrow>
          <h1 className="text-2xl font-semibold tracking-tight">Combien de temps par jour ?</h1>
          <p className="text-sm text-fg-muted">Tu pourras changer à chaque séance. Mieux vaut 15 minutes tous les jours que 45 minutes une fois par semaine.</p>
          <Card>
            <div className="overflow-x-auto scrollbar-none">
              <Segmented options={DURATION_OPTIONS} value={duration} onChange={setDuration} />
            </div>
          </Card>
          <Callout tone="info" title="Comment ça marche">
            Chaque séance : respiration → échauffement → 2 à 5 blocs de travail → retour au calme. Après chaque exercice, tu indiques ton ressenti : c&apos;est ce qui fait évoluer la routine.
          </Callout>
          <div className="flex gap-2">
            <Button variant="secondary" size="xl" onClick={() => setStep(1)}>←</Button>
            <Button size="xl" full onClick={() => setStep(3)}>Continuer →</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <Eyebrow>Étape 4 / {STEPS}</Eyebrow>
          <h1 className="text-2xl font-semibold tracking-tight">Veux-tu évaluer ta voix maintenant ?</h1>
          <p className="text-sm text-fg-muted leading-relaxed">
            Un test d&apos;environ six minutes, au micro. Il ne cherche pas ta note la plus aiguë ni la plus grave : il cherche quelles zones de ta voix sont accessibles, fiables et confortables. Tu peux l&apos;arrêter à tout moment.
          </p>
          <Card>
            <div className="text-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-fg-muted">Pupitre déclaré</span>
                <span className="font-medium">{partLabel(part)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-fg-muted">Zone de travail provisoire</span>
                <span className="font-mono">{midiToName(range.low)} → {midiToName(range.high)}</span>
              </div>
            </div>
          </Card>
          <Callout tone="warning" title="Pendant le test">
            On ne pousse jamais la voix. Un bouton « Je suis inconfortable » arrête l&apos;exercice immédiatement, et rien ne t&apos;est demandé au-delà.
          </Callout>
          <div className="grid gap-2">
            <Button size="xl" full onClick={() => finish(true)}>
              🎤 Faire le test maintenant
            </Button>
            <Button variant="secondary" size="xl" full onClick={() => finish(false)}>
              Plus tard
            </Button>
          </div>
          <div className="flex">
            <Button variant="ghost" onClick={() => setStep(2)}>← Revenir</Button>
          </div>
        </div>
      )}
    </div>
  );
}
