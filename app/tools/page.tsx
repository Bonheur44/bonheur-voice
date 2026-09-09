import Link from "next/link";
import { Eyebrow } from "@/components/ui";
import { TOOLS } from "./tools";

export const metadata = { title: "Outils" };

export default function ToolsPage() {
  return (
    <div className="space-y-5">
      <div>
        <Eyebrow>Hors séance</Eyebrow>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Outils musicaux</h1>
        <p className="mt-1 text-sm text-fg-muted">Pour travailler librement, préparer une répétition ou vérifier une note.</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {TOOLS.map((t) => (
          <li key={t.id}>
            <Link href={`/tools/${t.id}`} className="flex h-full items-start gap-4 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-accent/50">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-xl">{t.emoji}</div>
              <div>
                <div className="font-semibold">{t.name}</div>
                <div className="mt-0.5 text-sm text-fg-muted">{t.description}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
