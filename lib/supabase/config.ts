/**
 * Lecture des variables d'environnement Supabase.
 *
 * Les références à `process.env.NEXT_PUBLIC_*` doivent être écrites littéralement :
 * Next remplace ces expressions au moment de la compilation, un accès dynamique
 * renverrait `undefined` dans le navigateur.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** Vrai si l'application dispose des informations nécessaires pour joindre Supabase. */
export const isSupabaseConfigured: boolean = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

/** Clé localStorage du cache local, propre à chaque utilisateur. */
export function storageKeyFor(userId: string): string {
  return `vocal-training-tenor:v1:${userId}`;
}

/** Ancienne clé, utilisée avant l'introduction des comptes. Sert à proposer une reprise des données. */
export const LEGACY_STORAGE_KEY = "vocal-training-tenor:v1";
