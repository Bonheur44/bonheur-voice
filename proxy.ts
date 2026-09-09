import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Intercepteur de requêtes (convention `proxy.ts` de Next 16, qui remplace `middleware.ts`).
 *
 * Deux rôles : rafraîchir la session Supabase à chaque navigation, et rediriger
 * les visiteurs non connectés vers la page de connexion.
 */

/** Chemins accessibles sans compte. */
const PUBLIC_PATHS = ["/", "/login", "/reset-password", "/auth"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`)));
}

export default async function proxy(request: NextRequest) {
  // Sans configuration Supabase, l'application reste consultable et affiche
  // un écran d'installation : inutile de bloquer la navigation ici.
  if (!isSupabaseConfigured) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // getUser() valide le jeton auprès de Supabase et rafraîchit la session au besoin.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  // Déjà connecté : la page d'accueil et la page de connexion mènent au tableau de bord.
  if (user && (pathname === "/login" || pathname === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf les ressources statiques et les images,
     * afin que la session soit rafraîchie sur les navigations réelles uniquement.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
