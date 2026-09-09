"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button, Callout, Card, Eyebrow } from "@/components/ui";
import { SetupRequired } from "@/components/auth/SetupRequired";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!isSupabaseConfigured) return <SetupRequired />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    const { error: failure } = await getSupabaseClient().auth.updateUser({ password });
    if (failure) {
      setError(
        /auth session missing|not authenticated/i.test(failure.message)
          ? "Ce lien a expiré. Demande un nouveau lien depuis la page de connexion."
          : failure.message,
      );
      setBusy(false);
      return;
    }
    setDone(true);
    setBusy(false);
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 animate-rise">
      <Eyebrow>Sécurité</Eyebrow>
      <h1 className="mt-1 mb-5 text-2xl font-semibold tracking-tight">Nouveau mot de passe</h1>

      <Card>
        {done ? (
          <div className="space-y-4">
            <Callout tone="success">Mot de passe modifié.</Callout>
            <Button full size="lg" onClick={() => router.replace("/dashboard")}>
              Aller à ma séance
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Nouveau mot de passe</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                className="h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Confirmation</span>
              <input
                type="password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                autoComplete="new-password"
                required
                className="h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent"
              />
            </label>
            {error && <Callout tone="danger">{error}</Callout>}
            <Button type="submit" size="lg" full disabled={busy}>
              {busy ? "Un instant…" : "Enregistrer"}
            </Button>
          </form>
        )}
      </Card>

      <p className="mt-4 text-center text-sm">
        <Link href="/login" className="text-fg-muted hover:text-fg">
          Revenir à la connexion
        </Link>
      </p>
    </div>
  );
}
