"use client";

import { getAudioEngine } from "./engine";
import {
  DEFAULT_INSTRUMENT,
  DEFAULT_VOICE_SET,
  isInstrumentId,
  isVoiceSetId,
  type InstrumentId,
  type VoiceSetId,
} from "./timbres";

/**
 * Préférences sonores, volontairement conservées sur l'appareil et non dans le compte.
 * Le bon timbre dépend de ce sur quoi tu écoutes : un casque, le haut-parleur d'un
 * téléphone ou une enceinte ne demandent pas le même réglage.
 */

const KEY = "vocal-training-tenor:sound";

export interface SoundPreferences {
  instrument: InstrumentId;
  voiceSet: VoiceSetId;
}

const DEFAULTS: SoundPreferences = { instrument: DEFAULT_INSTRUMENT, voiceSet: DEFAULT_VOICE_SET };

let current: SoundPreferences = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function applyToEngine() {
  if (typeof window === "undefined") return;
  const engine = getAudioEngine();
  engine.setInstrument(current.instrument);
  engine.setVoiceSet(current.voiceSet);
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SoundPreferences>;
      current = {
        instrument: isInstrumentId(parsed.instrument) ? parsed.instrument : DEFAULTS.instrument,
        voiceSet: isVoiceSetId(parsed.voiceSet) ? parsed.voiceSet : DEFAULTS.voiceSet,
      };
    }
  } catch {
    current = DEFAULTS;
  }
  applyToEngine();
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // stockage indisponible : le réglage vaut alors pour la session en cours
  }
}

function update(patch: Partial<SoundPreferences>) {
  ensureLoaded();
  current = { ...current, ...patch };
  persist();
  applyToEngine();
  listeners.forEach((l) => l());
}

export function setInstrument(id: InstrumentId) {
  update({ instrument: id });
}

export function setVoiceSet(id: VoiceSetId) {
  update({ voiceSet: id });
}

export function subscribeSound(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSoundSnapshot(): SoundPreferences {
  ensureLoaded();
  return current;
}

export function getSoundServerSnapshot(): SoundPreferences {
  return DEFAULTS;
}

/** À appeler une fois au démarrage pour que le moteur suive les préférences enregistrées. */
export function loadSoundPreferences() {
  ensureLoaded();
  applyToEngine();
}
