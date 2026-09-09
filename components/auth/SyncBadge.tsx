"use client";

import { useSyncExternalStore } from "react";
import { syncService, type SyncStatus } from "@/lib/sync/service";
import { cn } from "@/lib/utils";

const subscribe = (cb: () => void) => syncService.subscribe(cb);
const getStatus = () => syncService.status;
const getServerStatus = (): SyncStatus => "idle";

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribe, getStatus, getServerStatus);
}

const LABELS: Record<SyncStatus, { text: string; dot: string } | null> = {
  idle: null,
  synced: null,
  loading: { text: "Chargement", dot: "bg-info animate-pulse-soft" },
  syncing: { text: "Synchronisation", dot: "bg-info animate-pulse-soft" },
  offline: { text: "Hors ligne", dot: "bg-warning" },
  error: { text: "Non synchronisé", dot: "bg-danger" },
};

/**
 * Indicateur discret : rien à l'écran quand tout va bien,
 * une pastille quand la progression n'est pas encore enregistrée à distance.
 */
export function SyncBadge({ className }: { className?: string }) {
  const status = useSyncStatus();
  const label = LABELS[status];
  if (!label) return null;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-fg-muted", className)}
      title={
        status === "offline"
          ? "Tes données sont enregistrées sur cet appareil et seront envoyées au retour du réseau."
          : status === "error"
            ? "La dernière tentative d'enregistrement a échoué. Nouvel essai automatique."
            : undefined
      }
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", label.dot)} />
      {label.text}
    </span>
  );
}
