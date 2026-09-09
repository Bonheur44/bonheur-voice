"use client";

import { Callout, Card, Eyebrow } from "@/components/ui";

/** Affiché tant que les variables d'environnement Supabase ne sont pas renseignées. */
export function SetupRequired() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 space-y-5">
      <div>
        <Eyebrow>Installation</Eyebrow>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Connexion à la base de données requise</h1>
        <p className="mt-2 text-fg-muted">
          L&apos;application a besoin d&apos;un projet Supabase pour gérer les comptes et enregistrer la progression.
        </p>
      </div>

      <Card>
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong">1</span>
            <span>
              Crée un projet sur <span className="font-mono text-fg">supabase.com</span>, gratuit.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong">2</span>
            <span>
              Dans Project Settings puis API, copie l&apos;URL du projet et la clé publique.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong">3</span>
            <span>
              Crée un fichier <span className="font-mono text-fg">.env.local</span> à la racine du projet, sur le modèle de{" "}
              <span className="font-mono text-fg">.env.example</span>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong">4</span>
            <span>
              Exécute le contenu de <span className="font-mono text-fg">supabase/migrations/0001_init.sql</span> dans l&apos;éditeur SQL de Supabase.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong">5</span>
            <span>Redémarre le serveur de développement.</span>
          </li>
        </ol>
      </Card>

      <Callout tone="info" title="Connexion Google">
        Facultative au démarrage. Elle s&apos;active dans Supabase, section Authentication puis Providers, après avoir créé un identifiant OAuth dans
        la console Google Cloud. La connexion par mot de passe fonctionne sans cette étape.
      </Callout>
    </div>
  );
}
