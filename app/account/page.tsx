"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { SyncBadge, useSyncStatus } from "@/components/auth/SyncBadge";
import { Button, Callout, Card, Eyebrow, SectionTitle, Spinner } from "@/components/ui";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
import { syncService } from "@/lib/sync/service";

export default function AccountPage() {
  const router = useRouter();
  const { user, ready, signOut } = useAuth();
  const status = useSyncStatus();
  const displayName = useAppStore((s) => s.profile.displayName ?? "");
  const updateProfile = useAppStore((s) => s.updateProfile);

  const [name, setName] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!ready) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner />
      </div>
    );
  }

  const currentName = name ?? displayName;
  const provider = user?.app_metadata?.provider ?? "email";

  const saveName = () => {
    updateProfile({ displayName: currentName.trim() || undefined });
    setMessage("Nom enregistré.");
    setError(null);
  };

  const changePassword = async () => {
    setError(null);
    setMessage(null);
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setBusy(true);
    const { error: failure } = await getSupabaseClient().auth.updateUser({ password });
    setBusy(false);
    if (failure) {
      setError(failure.message);
      return;
    }
    setPassword("");
    setMessage("Mot de passe modifié.");
  };

  const removeAccount = async () => {
    setBusy(true);
    setError(null);
    const { error: failure } = await getSupabaseClient().rpc("delete_account");
    if (failure) {
      setBusy(false);
      setError(`Suppression impossible : ${failure.message}`);
      return;
    }
    await signOut();
    router.replace("/");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <Eyebrow>Compte</Eyebrow>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Mon compte</h1>
        </div>
        <SyncBadge />
      </div>

      {message && <Callout tone="success">{message}</Callout>}
      {error && <Callout tone="danger">{error}</Callout>}

      <Card>
        <SectionTitle>Identité</SectionTitle>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-fg-muted">Adresse e-mail</dt>
            <dd className="truncate font-mono">{user?.email ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-fg-muted">Méthode de connexion</dt>
            <dd>{provider === "google" ? "Google" : "Mot de passe"}</dd>
          </div>
        </dl>

        <div className="mt-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Nom affiché</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={currentName}
                onChange={(e) => setName(e.target.value)}
                className="h-11 flex-1 rounded-xl border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent"
                placeholder="Ton prénom"
              />
              <Button variant="secondary" onClick={saveName}>
                Enregistrer
              </Button>
            </div>
          </label>
        </div>
      </Card>

      <Card>
        <SectionTitle>Synchronisation</SectionTitle>
        <p className="text-sm text-fg-muted">
          {status === "synced" || status === "idle"
            ? "Ta progression est enregistrée dans ton compte et te suit sur tous tes appareils."
            : status === "offline"
              ? "Hors ligne. Tes séances sont conservées sur cet appareil et seront envoyées au retour du réseau."
              : status === "error"
                ? "Le dernier enregistrement a échoué. Une nouvelle tentative est programmée."
                : "Synchronisation en cours."}
        </p>
        <Button variant="secondary" className="mt-3" onClick={() => void syncService.refresh()}>
          Synchroniser maintenant
        </Button>
      </Card>

      {provider !== "google" && (
        <Card>
          <SectionTitle>Mot de passe</SectionTitle>
          <div className="flex gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Nouveau mot de passe"
              className="h-11 flex-1 rounded-xl border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent"
            />
            <Button variant="secondary" onClick={() => void changePassword()} disabled={busy}>
              Modifier
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <SectionTitle>Session</SectionTitle>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="secondary"
            full
            onClick={async () => {
              await signOut();
              router.replace("/");
            }}
          >
            Se déconnecter
          </Button>
          <Link href="/settings" className="flex-1">
            <Button variant="ghost" full>
              Réglages de l&apos;entraînement
            </Button>
          </Link>
        </div>
      </Card>

      <Card className="border-danger/30">
        <SectionTitle>Supprimer mon compte</SectionTitle>
        <p className="text-sm text-fg-muted">
          Efface définitivement ton compte et toute ta progression : profil, compétences, séances et objectifs. Cette action est irréversible. Pense à
          exporter tes données depuis les réglages si tu veux en garder une copie.
        </p>
        {confirmDelete ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button variant="danger" full onClick={() => void removeAccount()} disabled={busy}>
              {busy ? "Suppression…" : "Oui, supprimer définitivement"}
            </Button>
            <Button variant="secondary" full onClick={() => setConfirmDelete(false)}>
              Annuler
            </Button>
          </div>
        ) : (
          <Button variant="danger" className="mt-3" onClick={() => setConfirmDelete(true)}>
            Supprimer mon compte
          </Button>
        )}
      </Card>
    </div>
  );
}
