import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { LEGAL, formatLegalDate } from "@/lib/legal/config";

const PAGES = [
  { href: "/legal/mentions", label: "Mentions légales" },
  { href: "/legal/confidentialite", label: "Confidentialité" },
  { href: "/legal/conditions", label: "Conditions d'utilisation" },
] as const;

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 py-5">
        <Link href="/" className="flex items-center gap-3">
          <Logo small />
          <div>
            <div className="text-sm font-semibold leading-tight">{LEGAL.serviceName}</div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-fg-subtle">Informations légales</div>
          </div>
        </Link>
        <Link href="/" className="text-sm text-fg-muted hover:text-fg">
          ← Retour au site
        </Link>
      </header>

      <nav aria-label="Documents légaux" className="flex flex-wrap gap-1.5 border-b border-border pb-4">
        {PAGES.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className="rounded-full border border-border-strong px-3 py-1 text-xs font-medium text-fg-muted transition-colors hover:border-accent/60 hover:text-fg"
          >
            {page.label}
          </Link>
        ))}
      </nav>

      <main className="pt-8">{children}</main>

      <footer className="mt-12 border-t border-border pt-5 text-xs text-fg-subtle">
        Dernière mise à jour : {formatLegalDate(LEGAL.updatedAt)}.
      </footer>
    </div>
  );
}
