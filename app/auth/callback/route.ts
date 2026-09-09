import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Point d'arrivée des redirections d'authentification :
 * connexion Google, confirmation d'adresse e-mail, lien de réinitialisation.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));

  const errorDescription = searchParams.get("error_description") ?? searchParams.get("error");
  if (errorDescription) return NextResponse.redirect(loginWithError(origin, errorDescription));

  if (!isSupabaseConfigured) return NextResponse.redirect(loginWithError(origin, "Supabase n'est pas configuré."));

  const supabase = await createSupabaseServerClient();

  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(loginWithError(origin, error.message));
    return NextResponse.redirect(new URL(next, origin));
  }

  // Liens envoyés par courriel (confirmation d'inscription, réinitialisation).
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return NextResponse.redirect(loginWithError(origin, error.message));
    return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(loginWithError(origin, "Lien de connexion incomplet ou expiré."));
}

/** N'accepte qu'un chemin interne, pour empêcher une redirection vers un site externe. */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

function loginWithError(origin: string, message: string): URL {
  const url = new URL("/login", origin);
  url.searchParams.set("error", message);
  return url;
}
