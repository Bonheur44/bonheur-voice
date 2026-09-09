"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { analyseVocalProfile } from "@/lib/vocal/profile";
import type { VocalAnalysis } from "@/lib/vocal/types";

/**
 * Analyse du profil vocal, recalculée depuis les observations.
 *
 * Rien n'est mémorisé en dehors des observations elles-mêmes : ajouter une
 * tentative suffit à faire évoluer le profil, sans invalidation à gérer.
 * Le calcul porte sur quelques centaines d'entrées, largement à la portée d'un
 * rendu ; `useMemo` évite simplement de le refaire à chaque frappe ailleurs.
 */
export function useVocalAnalysis(): VocalAnalysis {
  const observations = useAppStore((s) => s.observations);
  return useMemo(() => analyseVocalProfile(observations), [observations]);
}
