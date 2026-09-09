"use client";

import { useState } from "react";
import { ExercisePlayer } from "@/components/exercises/ExercisePlayer";
import { Spinner } from "@/components/ui";
import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/store/hooks";

export default function PlayPage() {
  const hydrated = useHydrated();
  if (!hydrated) {
    return (
      <div className="flex-1 grid place-items-center">
        <Spinner />
      </div>
    );
  }
  return <PlayInner />;
}

function PlayInner() {
  // La séance est figée au montage ; le lecteur gère l'index localement.
  const [initial] = useState(() => {
    const st = useAppStore.getState();
    return st.currentSession ?? st.ensureTodaySession();
  });
  const live = useAppStore((s) => s.currentSession);
  const session = live && live.id === initial.id ? live : initial;
  return <ExercisePlayer key={initial.id} session={session} />;
}
