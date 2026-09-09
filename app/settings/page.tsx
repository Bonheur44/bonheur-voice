"use client";

import { useRef, useState } from "react";
import { Piano } from "@/components/audio/Piano";
import { Button, Callout, Card, Eyebrow, SectionTitle, Segmented, Slider, Spinner } from "@/components/ui";
import { DURATION_OPTIONS } from "@/components/routine/SessionPlan";
import { getAudioEngine } from "@/lib/audio/engine";
import { midiToName } from "@/lib/audio/notes";
import { computeLevel } from "@/lib/progression";
import { LEVELS } from "@/lib/skills";
import { exportData, useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/store/hooks";
import type { AppData, Level } from "@/lib/types";

export default function SettingsPage() {
  const hydrated = useHydrated();
  const profile = useAppStore((s) => s.profile);
  const skills = useAppStore((s) => s.skills);
  const sessions = useAppStore((s) => s.sessions);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const importData = useAppStore((s) => s.importData);
  const resetAll = useAppStore((s) => s.resetAll);
  const [picking, setPicking] = useState<"low" | "high">("low");
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!hydrated) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner />
      </div>
    );
  }

  const autoLevel = computeLevel(skills, sessions);

  const doExport = () => {
    const data = exportData(useAppStore.getState());
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vocal-training-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as AppData;
      if (!data.profile || !data.skills) throw new Error("format");
      importData(data);
      setMessage("Données importées.");
    } catch {
      setMessage("Fichier invalide.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Personnalisation</Eyebrow>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Réglages</h1>
      </div>

      <Card>
        <SectionTitle>Durée par défaut</SectionTitle>
        <div className="overflow-x-auto scrollbar-none">
          <Segmented options={DURATION_OPTIONS} value={profile.preferredDuration} onChange={(d) => updateProfile({ preferredDuration: d })} />
        </div>
      </Card>

      <Card>
        <SectionTitle>Zone confortable</SectionTitle>
        <p className="mb-3 text-sm text-fg-muted">
          Les exercices ne dépassent jamais cette zone. Marque la note la plus basse et la plus haute que tu tiens <strong>sans effort</strong>, pas ta limite absolue.
        </p>
        <Segmented
          options={[
            { value: "low", label: `Basse : ${midiToName(profile.lowNote)}` },
            { value: "high", label: `Haute : ${midiToName(profile.highNote)}` },
          ]}
          value={picking}
          onChange={setPicking}
          className="mb-3"
        />
        <Piano
          from={40}
          to={76}
          lowMark={profile.lowNote}
          highMark={profile.highNote}
          onPress={(m) => {
            if (picking === "low") updateProfile({ lowNote: Math.min(m, profile.highNote - 5) });
            else updateProfile({ highNote: Math.max(m, profile.lowNote + 5) });
          }}
        />
        <p className="mt-2 text-xs text-fg-subtle">
          {midiToName(profile.lowNote)} → {midiToName(profile.highNote)} · {profile.highNote - profile.lowNote} demi-tons
        </p>
      </Card>

      <Card>
        <SectionTitle>Niveau</SectionTitle>
        <p className="mb-3 text-sm text-fg-muted">
          Niveau calculé automatiquement : <strong>{autoLevel} · {LEVELS[autoLevel].name}</strong>. Tu peux le forcer si tu as déjà de l&apos;expérience, ou pour revenir aux fondations.
        </p>
        <Segmented
          options={[{ value: 0, label: "Auto" }, ...([1, 2, 3, 4] as Level[]).map((l) => ({ value: l, label: `${l} · ${LEVELS[l].name}` }))]}
          value={profile.manualLevel ?? 0}
          onChange={(v) => updateProfile({ manualLevel: v === 0 ? undefined : (v as Level) })}
          className="flex-wrap"
        />
      </Card>

      <Card>
        <SectionTitle>Volume des sons</SectionTitle>
        <Slider
          label="Volume"
          value={Math.round(profile.volume * 100)}
          min={10}
          max={100}
          onChange={(v) => {
            updateProfile({ volume: v / 100 });
            try {
              getAudioEngine().setVolume(v / 100);
            } catch {
              /* ignore */
            }
          }}
          format={(v) => `${v}%`}
        />
        <Button size="sm" variant="secondary" className="mt-3" onClick={() => { const e = getAudioEngine(); e.setVolume(profile.volume); e.play(60, 0.6, "piano"); }}>
          🔊 Tester
        </Button>
      </Card>

      <Card>
        <SectionTitle>Données</SectionTitle>
        <p className="mb-3 text-sm text-fg-muted">Tout est stocké dans ce navigateur. Exporte un fichier pour sauvegarder ou changer d&apos;appareil.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={doExport}>⬇️ Exporter</Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>⬆️ Importer</Button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
          {!confirmReset ? (
            <Button variant="danger" onClick={() => setConfirmReset(true)}>Réinitialiser</Button>
          ) : (
            <Button variant="danger" onClick={() => { resetAll(); setConfirmReset(false); setMessage("Données réinitialisées."); }}>
              Confirmer la réinitialisation
            </Button>
          )}
        </div>
        {message && <p className="mt-3 text-sm text-fg-muted">{message}</p>}
      </Card>

      <Callout tone="warning" title="Rappel">
        Cette application propose des exercices d&apos;entraînement. Elle ne mesure pas ta voix avec précision et ne remplace ni un professeur de chant ni un avis médical. En cas de douleur, d&apos;enrouement persistant ou de fatigue vocale, consulte.
      </Callout>
    </div>
  );
}
