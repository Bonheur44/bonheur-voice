/**
 * Chemins accessibles sans compte.
 *
 * Cette liste sert deux fois : `proxy.ts` s'en sert pour rediriger côté serveur,
 * `AppShell` pour décider d'afficher ou non la navigation applicative. Les deux
 * doivent voir exactement la même chose — une page légale visible côté serveur
 * mais renvoyée vers la connexion côté client serait un défaut difficile à
 * remarquer, d'où la source unique.
 */
export const PUBLIC_PATHS = ["/", "/login", "/reset-password", "/auth", "/legal"] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`)));
}
