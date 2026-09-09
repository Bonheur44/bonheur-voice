"use client";

import { LEGACY_STORAGE_KEY } from "@/lib/supabase/config";
import type { AppData } from "@/lib/types";

/**
 * Données enregistrées avant l'introduction des comptes, sous l'ancienne clé
 * localStorage. On les lit une seule fois pour proposer de les reprendre.
 *
 * Exposé sous forme de petit magasin externe afin d'être lu avec
 * `useSyncExternalStore` : cela évite d'écrire dans l'état pendant un effet.
 */

const DISMISSED_KEY = "vocal-training-tenor:legacy-dismissed";

let cache: AppData | null = null;
let computed = false;
const listeners = new Set<() => void>();

function read(): AppData | null {
  try {
    if (typeof window === "undefined") return null;
    if (window.localStorage.getItem(DISMISSED_KEY)) return null;
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: AppData };
    const state = parsed?.state;
    if (!state) return null;
    const hasContent = (state.sessions?.length ?? 0) > 0 || state.profile?.onboarded === true;
    return hasContent ? state : null;
  } catch {
    return null;
  }
}

function notify() {
  listeners.forEach((l) => l());
}

export function subscribeLegacy(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLegacySnapshot(): AppData | null {
  if (!computed) {
    cache = read();
    computed = true;
  }
  return cache;
}

export function getLegacyServerSnapshot(): AppData | null {
  return null;
}

/** Marque la proposition comme traitée, avec ou sans reprise des données. */
export function dismissLegacy(alsoDelete: boolean): void {
  try {
    window.localStorage.setItem(DISMISSED_KEY, new Date().toISOString());
    if (alsoDelete) window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // stockage indisponible : la proposition réapparaîtra, sans conséquence
  }
  cache = null;
  computed = true;
  notify();
}
