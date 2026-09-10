import { cn } from "@/lib/utils";

/**
 * Marque de l'application.
 *
 * Quatre barres : les quatre voix d'un chœur. Leur profil monte puis redescend,
 * comme une phrase musicale, et l'une domine nettement — la ligne que l'on
 * apprend à tenir au milieu des autres. C'est le sujet même du produit.
 *
 * Le contraste repose sur la hauteur et non sur la couleur : à seize pixels,
 * un écart de teinte disparaît, un écart de hauteur reste lisible.
 *
 * Géométrie identique à `app/icon.svg`, aux mêmes coordonnées : toute
 * modification doit être reportée dans les deux fichiers.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      <defs>
        {/* Identifiant fixe : plusieurs marques peuvent coexister sur une page,
            leurs définitions sont identiques et se résolvent donc de la même façon. */}
        <linearGradient id="vt-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#vt-logo)" />
      <g fill="#0b0d12">
        <rect x="5.25" y="11" width="3.5" height="10" rx="1.75" />
        <rect x="11.25" y="7" width="3.5" height="18" rx="1.75" />
        <rect x="17.25" y="4.5" width="3.5" height="23" rx="1.75" />
        <rect x="23.25" y="9" width="3.5" height="14" rx="1.75" />
      </g>
    </svg>
  );
}

export function Logo({ small }: { small?: boolean }) {
  return <LogoMark className={cn("shrink-0 rounded-xl shadow-glow", small ? "h-8 w-8" : "h-10 w-10")} />;
}
