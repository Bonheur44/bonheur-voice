"use client";

import Link from "next/link";
import { DeclaredVsEstimated, VocalProfileCard } from "@/components/vocal/VocalProfileCard";
import { useVocalAnalysis } from "@/components/vocal/useVocalAnalysis";
import { Badge, Callout, Card, Eyebrow, SectionTitle } from "@/components/ui";
import { ASSESSMENTS, ASSESSMENT_ORDER } from "@/lib/assessment/catalog";
import { useHydrated } from "@/lib/store/hooks";
import { cn } from "@/lib/utils";

export function AssessmentHub() {
  const hydrated = useHydrated();
  const analysis = useVocalAnalysis();

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Évaluer ma voix</Eyebrow>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Ce que tes performances semblent indiquer</h1>
        <p className="mt-2 text-sm text-fg-muted leading-relaxed">
          Ces tests ne disent pas qui tu es. Ils disent ce qui est fiable, ce qui reste incertain, et comment continuer à
          progresser. Le profil se précise à mesure que tu chantes.
        </p>
      </div>

      {hydrated && (
        <>
          <VocalProfileCard />
          <DeclaredVsEstimated />
        </>
      )}

      <div>
        <SectionTitle>La batterie d&apos;évaluation</SectionTitle>
        <ul className="mt-3 space-y-2">
          {ASSESSMENT_ORDER.map((id) => {
            const test = ASSESSMENTS[id];
            const available = test.status === "available";
            const body = (
              <Card className={cn("transition-colors", available ? "hover:border-accent/60" : "opacity-70")}>
                <div className="flex items-start gap-3">
                  <span className="text-xl" aria-hidden>
                    {test.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{test.name}</span>
                      {!available && <Badge>bientôt</Badge>}
                      {test.needsMic && <Badge color="#38bdf8">micro</Badge>}
                      <span className="text-xs text-fg-subtle">~{test.minutes} min</span>
                    </div>
                    <p className="mt-1 text-sm text-fg-muted">{test.question}</p>
                    <p className="mt-1 text-xs text-fg-subtle">{test.measures}</p>
                  </div>
                </div>
              </Card>
            );
            return <li key={id}>{available && test.href ? <Link href={test.href}>{body}</Link> : body}</li>;
          })}
        </ul>
      </div>

      {analysis.dataConfidence !== "insufficient" && (
        <Callout tone="info" title="Étendue, zone confortable, tessiture">
          <p>
            <strong>Étendue :</strong> les notes que ta voix peut actuellement produire.
          </p>
          <p className="mt-1">
            <strong>Zone confortable :</strong> les notes que tu chantes avec facilité et stabilité.
          </p>
          <p className="mt-1">
            <strong>Tessiture :</strong> la zone dans laquelle une voix fonctionne de manière confortable et musicale sur la
            durée. L&apos;application parle de « profil vocal estimé » : établir une tessiture demande une écoute humaine, pas
            une suite de mesures.
          </p>
        </Callout>
      )}

      <Callout tone="warning" title="Ce que ces tests ne sont pas">
        Ni un diagnostic médical, ni un verdict sur ton pupitre. En cas de gêne persistante, de voix qui se fatigue vite ou de
        douleur, consulte un professeur de chant ou un professionnel de santé.
      </Callout>
    </div>
  );
}
