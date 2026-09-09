"use client";

import { useSyncExternalStore } from "react";
import { Button, Card, Eyebrow } from "@/components/ui";
import { useAppStore } from "@/lib/store";
import { completedSessions } from "@/lib/progression";
import { formatHours } from "@/lib/utils";
import { dismissLegacy, getLegacySnapshot, getLegacyServerSnapshot, subscribeLegacy } from "./legacy-store";

/**
 * Propose de reprendre la progression enregistrée sur cet appareil avant la
 * création des comptes. Ne s'affiche que si le compte courant est encore vierge.
 */
export function LegacyImportPrompt() {
  const legacy = useSyncExternalStore(subscribeLegacy, getLegacySnapshot, getLegacyServerSnapshot);
  const importData = useAppStore((s) => s.importData);
  const accountIsEmpty = useAppStore((s) => s.sessions.length === 0 && !s.profile.onboarded);

  if (!legacy || !accountIsEmpty) return null;

  const done = completedSessions(legacy.sessions ?? []);
  const total = done.reduce((a, s) => a + s.totalDuration, 0);

  return (
    <Card glow className="animate-rise">
      <Eyebrow>Progression trouvée sur cet appareil</Eyebrow>
      <p className="mt-2 text-sm text-fg-muted">
        Une progression enregistrée avant la création des comptes existe sur ce navigateur. Elle contient {done.length} séance
        {done.length > 1 ? "s" : ""} terminée{done.length > 1 ? "s" : ""} et {formatHours(total)} d&apos;entraînement. Veux-tu la reprendre dans ton
        compte ?
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          full
          onClick={() => {
            importData(legacy);
            dismissLegacy(true);
          }}
        >
          Reprendre cette progression
        </Button>
        <Button variant="secondary" full onClick={() => dismissLegacy(false)}>
          Repartir de zéro
        </Button>
      </div>
    </Card>
  );
}
