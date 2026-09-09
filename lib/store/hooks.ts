"use client";

import { useSyncExternalStore } from "react";
import { useAppStore } from "./index";

const subscribeHydration = (cb: () => void) => useAppStore.persist.onFinishHydration(cb);
const getHydrated = () => useAppStore.persist.hasHydrated();
const getServerHydrated = () => false;

/** Vrai une fois l'état persistant rechargé côté client (évite les écarts d'hydratation). */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribeHydration, getHydrated, getServerHydrated);
}

export function useLevel() {
  return useAppStore((s) => s.profile.manualLevel ?? s.profile.level);
}
