import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Typographie des pages légales.
 *
 * Le projet n'utilise pas de plugin de prose : quelques primitives suffisent, et
 * elles gardent les documents alignés sur le reste de l'interface plutôt que sur
 * un style importé.
 */

export function LegalArticle({ children }: { children: ReactNode }) {
  return <article className="space-y-8 text-sm leading-relaxed text-fg-muted">{children}</article>;
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-fg">{title}</h2>
      {children}
    </section>
  );
}

export function LegalList({ children, ordered }: { children: ReactNode; ordered?: boolean }) {
  const className = "ml-4 space-y-1.5 list-outside marker:text-fg-subtle";
  return ordered ? (
    <ol className={cn(className, "list-decimal")}>{children}</ol>
  ) : (
    <ul className={cn(className, "list-disc")}>{children}</ul>
  );
}

/** Tableau clé/valeur, pour les identités et les durées de conservation. */
export function LegalTable({ rows, headers }: { rows: Array<{ label: string; value: ReactNode }>; headers?: [string, string] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        {headers && (
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="py-2 pr-4 font-semibold text-fg">{headers[0]}</th>
              <th scope="col" className="py-2 font-semibold text-fg">{headers[1]}</th>
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-border align-top last:border-0">
              <th scope="row" className="w-2/5 min-w-36 py-2.5 pr-4 font-medium text-fg">
                {row.label}
              </th>
              <td className="py-2.5">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
