"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button, Callout, Card, Eyebrow } from "@/components/ui";
import { Logo } from "@/components/layout/Logo";
import { getSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { GoogleIcon } from "./GoogleIcon";

type Mode = "signin" | "signup" | "forgot";

const TITLES: Record<Mode, string> = {
  signin: "Content de te revoir",
  signup: "Crée ton compte",
  forgot: "Mot de passe oublié",
};

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error"));
  const [notice, setNotice] = useState<string | null>(null);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setNotice(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.includes("@")) {
      setError("Adresse e-mail invalide.");
      return;
    }
    if (mode !== "forgot" && password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setBusy(true);
    try {
      const supabase = getSupabaseClient();
      const origin = window.location.origin;

      if (mode === "signin") {
        const { error: failure } = await supabase.auth.signInWithPassword({ email, password });
        if (failure) throw failure;
        router.replace(next);
        router.refresh();
        return;
      }

      if (mode === "signup") {
        const { data, error: failure } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
            data: displayName.trim() ? { display_name: displayName.trim() } : undefined,
          },
        });
        if (failure) throw failure;
        if (data.session) {
          router.replace(next);
          router.refresh();
          return;
        }
        setNotice("Compte créé. Ouvre le message de confirmation envoyé à ton adresse pour activer ton accès.");
        setBusy(false);
        return;
      }

      const { error: failure } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
      });
      if (failure) throw failure;
      setNotice("Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé.");
      setBusy(false);
    } catch (err) {
      setError(translate(err));
      setBusy(false);
    }
  };

  const google = async () => {
    setError(null);
    setBusy(true);
    try {
      const supabase = getSupabaseClient();
      const { error: failure } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (failure) throw failure;
      // La navigation vers Google prend le relais.
    } catch (err) {
      setError(translate(err));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10 sm:py-16 animate-rise">
      <Link href="/" className="flex items-center gap-3 self-start">
        <Logo />
        <div>
          <div className="text-sm font-semibold leading-tight">Vocal Training</div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-fg-subtle">Tenor</div>
        </div>
      </Link>

      <div>
        <Eyebrow>{mode === "signup" ? "Inscription" : "Connexion"}</Eyebrow>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{TITLES[mode]}</h1>
        <p className="mt-2 text-sm text-fg-muted">
          {mode === "forgot"
            ? "Indique ton adresse : tu recevras un lien pour choisir un nouveau mot de passe."
            : "Ta progression te suit sur tous tes appareils."}
        </p>
      </div>

      <Card>
        {mode !== "forgot" && (
          <>
            <Button variant="secondary" size="lg" full onClick={google} disabled={busy}>
              <GoogleIcon className="h-5 w-5" />
              Continuer avec Google
            </Button>
            <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
              <span className="h-px flex-1 bg-border" />
              ou
              <span className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <Field label="Nom affiché" hint="Facultatif">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="nickname"
                placeholder="Comment on t'appelle au pupitre"
                className={inputClass}
              />
            </Field>
          )}

          <Field label="Adresse e-mail">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className={inputClass}
            />
          </Field>

          {mode !== "forgot" && (
            <Field label="Mot de passe" hint={mode === "signup" ? "8 caractères minimum" : undefined}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                className={inputClass}
              />
            </Field>
          )}

          {error && <Callout tone="danger">{error}</Callout>}
          {notice && <Callout tone="success">{notice}</Callout>}

          <Button type="submit" size="lg" full disabled={busy}>
            {busy ? "Un instant…" : mode === "signin" ? "Se connecter" : mode === "signup" ? "Créer mon compte" : "Envoyer le lien"}
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          {mode === "signin" ? (
            <>
              <button type="button" onClick={() => switchMode("signup")} className="text-accent-strong hover:underline">
                Créer un compte
              </button>
              <button type="button" onClick={() => switchMode("forgot")} className="text-fg-muted hover:text-fg">
                Mot de passe oublié
              </button>
            </>
          ) : (
            <button type="button" onClick={() => switchMode("signin")} className="text-accent-strong hover:underline">
              ← Revenir à la connexion
            </button>
          )}
        </div>
      </Card>

      <p className="text-center text-[11px] text-fg-subtle">
        Ton adresse sert uniquement à identifier ton compte. Aucun enregistrement audio n&apos;est transmis : l&apos;analyse du micro reste dans ton
        navigateur.
      </p>
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm outline-none placeholder:text-fg-subtle focus:border-accent";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className={cn("mb-1.5 flex items-baseline justify-between")}>
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-[11px] text-fg-subtle">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

/** Traduit les messages d'erreur les plus fréquents de Supabase. */
function translate(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const map: Array<[RegExp, string]> = [
    [/invalid login credentials/i, "Adresse e-mail ou mot de passe incorrect."],
    [/email not confirmed/i, "Adresse non confirmée. Ouvre le message reçu à l'inscription."],
    [/user already registered|already been registered/i, "Un compte existe déjà pour cette adresse. Connecte-toi."],
    [/password should be at least/i, "Mot de passe trop court."],
    [/rate limit|too many requests/i, "Trop de tentatives. Réessaie dans quelques minutes."],
    [/provider is not enabled/i, "La connexion Google n'est pas encore activée sur ce projet Supabase."],
    [/failed to fetch|network/i, "Réseau indisponible. Vérifie ta connexion."],
  ];
  for (const [pattern, text] of map) if (pattern.test(message)) return text;
  return message;
}
