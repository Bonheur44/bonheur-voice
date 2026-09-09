import Link from "next/link";
import { Card, Eyebrow, LinkButton } from "@/components/ui";
import { SKILLS, SKILL_ORDER } from "@/lib/skills";
import { EXERCISES } from "@/data/exercises";

export const metadata = {
  title: "Vocal Training — Tenor",
  description: "Routine vocale quotidienne, progressive et personnalisée, pensée pour les ténors de chorale.",
};

const STEPS = [
  { title: "Ta séance du jour", text: "Générée selon ton niveau, le temps dont tu disposes et tes retours des jours précédents." },
  { title: "Un exercice à la fois", text: "Objectif, consignes, sensations à surveiller, erreurs fréquentes, minuteur et outil sonore." },
  { title: "Ton ressenti", text: "Cinq réponses, de « très difficile » à « très facile ». C'est ce qui fait évoluer la routine." },
  { title: "Ta progression", text: "Compétences, séries de jours, historique. Tout est enregistré dans ton compte." },
];

export default function LandingPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-16 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-accent to-orange-600 text-base font-black text-black shadow-glow" aria-hidden>
            ♪
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">Vocal Training</div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-fg-subtle">Tenor</div>
          </div>
        </div>
        <Link href="/login" className="text-sm font-medium text-fg-muted hover:text-fg">
          Se connecter
        </Link>
      </header>

      <section className="py-10 sm:py-16 animate-rise">
        <Eyebrow>Chorale · pupitre de ténors</Eyebrow>
        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Progresser un peu,
          <br />
          <span className="text-accent-strong">tous les jours.</span>
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-fg-muted sm:text-lg">
          Une routine vocale courte et progressive : le souffle, la note qui ne tremble plus, la justesse, l&apos;articulation, les registres, et
          surtout tenir sa ligne de ténor quand les autres voix chantent autre chose.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <LinkButton href="/login" size="xl">
            Créer mon compte
          </LinkButton>
          <LinkButton href="/login" size="xl" variant="secondary">
            J&apos;ai déjà un compte
          </LinkButton>
        </div>
        <p className="mt-4 text-xs text-fg-subtle">
          {EXERCISES.length} exercices, {SKILL_ORDER.length} compétences suivies, séances de 10 à 45 minutes.
        </p>
      </section>

      <section className="py-8">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Ce que tu travailles</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {SKILL_ORDER.map((id) => (
            <Card key={id} className="flex items-start gap-3">
              <span className="text-xl" aria-hidden>
                {SKILLS[id].emoji}
              </span>
              <div>
                <div className="font-medium">{SKILLS[id].label}</div>
                <div className="mt-0.5 text-sm text-fg-muted">{SKILLS[id].description}</div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="py-8">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Comment ça se passe</h2>
        <ol className="grid gap-3 sm:grid-cols-2">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong">{i + 1}</span>
                <span className="font-medium">{step.title}</span>
              </div>
              <p className="mt-2 text-sm text-fg-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="py-8">
        <Card className="border-accent/25">
          <h2 className="text-lg font-semibold tracking-tight">Le mode chorale</h2>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            Ta ligne de ténor est jouée seule, puis accompagnée d&apos;une voix, puis de trois. Le volume de ta propre ligne baisse progressivement
            jusqu&apos;à disparaître, pendant que soprano, alto et basse continuent. C&apos;est l&apos;entraînement direct de ce qui manque le plus en
            répétition : garder sa ligne sans se laisser attirer par les autres.
          </p>
        </Card>
      </section>

      <section className="py-8">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Ce que l&apos;application ne fait pas</h2>
        <div className="space-y-2 text-sm leading-relaxed text-fg-muted">
          <p>
            L&apos;analyse du micro donne un repère approximatif, utile sur une voyelle tenue dans une pièce calme. Elle se trompe parfois
            d&apos;octave et n&apos;est pas fiable sur les consonnes. Aucun son n&apos;est enregistré ni transmis : tout reste dans ton navigateur.
          </p>
          <p>
            Ce n&apos;est ni un professeur de chant, ni un diagnostic médical. La règle est simple : jamais de douleur, jamais de forçage, on
            s&apos;arrête quand la voix fatigue.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6 text-center sm:p-8">
        <h2 className="text-xl font-semibold tracking-tight">Prêt pour la première séance ?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
          Quinze minutes suffisent. Tu règles ta zone de confort au piano, et la première routine est prête.
        </p>
        <div className="mt-5 flex justify-center">
          <LinkButton href="/login" size="xl">
            Commencer
          </LinkButton>
        </div>
      </section>

      <footer className="pt-10 text-center text-[11px] text-fg-subtle">Vocal Training — Tenor · outil d&apos;entraînement vocal personnel</footer>
    </div>
  );
}
