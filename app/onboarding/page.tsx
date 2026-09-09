"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Piano } from "@/components/audio/Piano";
import { Logo } from "@/components/layout/Logo";
import { Button, Callout, Card, Eyebrow, Segmented } from "@/components/ui";
import { DURATION_OPTIONS } from "@/components/routine/SessionPlan";
import { DEFAULT_TENOR_RANGE, midiToName } from "@/lib/audio/notes";
import { SKILLS, SKILL_ORDER } from "@/lib/skills";
import { useAppStore } from "@/lib/store";

export default function OnboardingPage() {
  const router = useRouter();
  const complete = useAppStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [low, setLow] = useState(DEFAULT_TENOR_RANGE.low);
  const [high, setHigh] = useState(DEFAULT_TENOR_RANGE.high);
  const [picking, setPicking] = useState<"low" | "high">("low");
  const [duration, setDuration] = useState(20 * 60);

  const finish = () => {
    complete({ lowNote: low, highNote: high, preferredDuration: duration });
    router.replace("/dashboard");
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12 animate-rise">
      <div className="mb-8 flex items-center gap-3">
        <Logo />
        <div>
          <div className="font-semibold">Vocal Training</div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-fg-subtle">Tenor</div>
        </div>
      </div>

      <div className="mb-6 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-surface-3"}`} />
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-5">
          <Eyebrow>Bienvenue</Eyebrow>
          <h1 className="text-3xl font-semibold tracking-tight">Ton coach vocal de poche, pensé pour un ténor de chorale.</h1>
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
          <Eyebrow>Étape 2 / 3</Eyebrow>
          <h1 className="text-2xl font-semibold tracking-tight">Ta zone confortable</h1>
          <p className="text-sm text-fg-muted leading-relaxed">
            L&apos;étiquette « ténor » ne dit pas quelles notes sont confortables <em>pour toi</em>. Joue les touches, chante doucement, et marque la note la plus basse et la plus haute que tu tiens <strong>sans effort</strong>. Tu pourras changer ça plus tard.
          </p>
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <Segmented
                options={[
                  { value: "low", label: `Basse : ${midiToName(low)}` },
                  { value: "high", label: `Haute : ${midiToName(high)}` },
                ]}
                value={picking}
                onChange={setPicking}
              />
            </div>
            <Piano
              from={40}
              to={76}
              lowMark={low}
              highMark={high}
              onPress={(m) => {
                if (picking === "low") setLow(Math.min(m, high - 5));
                else setHigh(Math.max(m, low + 5));
              }}
            />
            <p className="mt-3 text-xs text-fg-subtle">
              Zone : {midiToName(low)} → {midiToName(high)} ({high - low} demi-tons). Repère classique pour un ténor amateur : Do3 → Sol4, mais fie-toi à ton confort.
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
          <Eyebrow>Étape 3 / 3</Eyebrow>
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
            <Button size="xl" full onClick={finish}>C&apos;est parti 🎤</Button>
          </div>
        </div>
      )}
    </div>
  );
}
