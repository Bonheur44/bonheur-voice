"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { resetToSignedOut, switchStorageForUser } from "@/lib/store";
import { syncService } from "@/lib/sync/service";

interface AuthContextValue {
  user: User | null;
  /** Faux tant que la session, le cache local et la première synchronisation ne sont pas résolus. */
  ready: boolean;
  configured: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  ready: false,
  configured: false,
  signOut: async () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Sans configuration Supabase, rien n'est à attendre : l'écran d'installation s'affiche.
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const activeUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabaseClient();
    let cancelled = false;

    /**
     * Bascule le cache local puis lance la synchronisation.
     * Volontairement appelé hors du gestionnaire d'événements de Supabase :
     * interroger la base depuis ce gestionnaire peut bloquer le verrou d'authentification.
     */
    const applyUser = async (next: User | null) => {
      if (cancelled) return;
      const nextId = next?.id ?? null;
      if (nextId === activeUserId.current) {
        setUser(next);
        return;
      }
      activeUserId.current = nextId;
      setReady(false);
      if (next) {
        await switchStorageForUser(next.id);
        await syncService.start(next.id);
      } else {
        syncService.stop();
        resetToSignedOut();
      }
      if (cancelled) return;
      setUser(next);
      setReady(true);
    };

    void supabase.auth.getSession().then(({ data }) => {
      window.setTimeout(() => void applyUser(data.session?.user ?? null), 0);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => void applyUser(session?.user ?? null), 0);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    syncService.stop();
    await getSupabaseClient().auth.signOut();
  }, []);

  return <AuthContext.Provider value={{ user, ready, configured: isSupabaseConfigured, signOut }}>{children}</AuthContext.Provider>;
}
