import type { StateStorage } from "zustand/middleware";

/**
 * Adaptateur de stockage. Aujourd'hui : localStorage.
 * Pour brancher Supabase plus tard : implémenter la même interface (getItem/setItem/removeItem)
 * avec une synchronisation distante, puis la passer au middleware `persist` du store.
 */
export interface StorageAdapter extends StateStorage {
  name: string;
}

export const localStorageAdapter: StorageAdapter = {
  name: "local",
  getItem: (key) => {
    try {
      return typeof window === "undefined" ? null : window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(key, value);
    } catch {
      /* quota / navigation privée */
    }
  },
  removeItem: (key) => {
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export const STORAGE_KEY = "vocal-training-tenor:v1";
