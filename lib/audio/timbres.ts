/**
 * Banques de timbres.
 *
 * Un vrai instrument échantillonné ou un greffon VST ne peut pas fonctionner dans
 * un navigateur : tout est synthétisé ici avec des oscillateurs, un filtre et une
 * enveloppe. Les noms décrivent donc une intention sonore, pas une imitation fidèle.
 *
 * Ce module ne contient que des données et des fonctions pures : il est testable
 * sans navigateur et n'importe rien du moteur audio.
 */

export interface TimbreConfig {
  osc: OscillatorType;
  osc2?: OscillatorType;
  osc2Gain?: number;
  /** Désaccord du second oscillateur en cents : donne de l'épaisseur. */
  detune2?: number;
  /** Fréquence de coupure du filtre passe-bas, en Hz. */
  cutoff: number;
  attack: number;
  /** Durée de chute vers le niveau de tenue. Absent ou 0 : pas de chute. */
  decay?: number;
  /** Niveau de tenue, de 0 à 1. 1 tient comme un orgue, 0,3 s'éteint comme un piano. */
  sustain?: number;
  release: number;
  vibratoRate?: number;
  vibratoDepth?: number;
  /** Délai avant l'installation du vibrato, en secondes. */
  vibratoDelay?: number;
  gain: number;
}

export type VoicePartId = "S" | "A" | "T" | "B";
export type Role = "piano" | "drone" | "click" | VoicePartId;

export const VOICE_PARTS: VoicePartId[] = ["S", "A", "T", "B"];

// ------------------------------------------------------------------ instruments

export type InstrumentId = "piano" | "bright" | "rhodes" | "organ" | "flute" | "sine";

export interface InstrumentPreset {
  id: InstrumentId;
  label: string;
  description: string;
  config: TimbreConfig;
}

export const INSTRUMENTS: Record<InstrumentId, InstrumentPreset> = {
  piano: {
    id: "piano",
    label: "Piano doux",
    description: "Timbre par défaut, proche d'un piano droit. Bon compromis pour tout travailler.",
    config: { osc: "triangle", osc2: "sine", osc2Gain: 0.5, cutoff: 4200, attack: 0.004, decay: 0.9, sustain: 0.3, release: 0.28, gain: 0.5 },
  },
  bright: {
    id: "bright",
    label: "Piano clair",
    description: "Plus brillant, se détache mieux si tu chantes fort ou dans une pièce sonore.",
    config: { osc: "sawtooth", osc2: "triangle", osc2Gain: 0.35, cutoff: 5200, attack: 0.003, decay: 0.7, sustain: 0.22, release: 0.22, gain: 0.36 },
  },
  rhodes: {
    id: "rhodes",
    label: "Piano électrique",
    description: "Rond et enveloppant, agréable pour les longues séances.",
    config: { osc: "sine", osc2: "sine", osc2Gain: 0.45, detune2: 7, cutoff: 2400, attack: 0.01, decay: 1.6, sustain: 0.35, release: 0.5, gain: 0.55 },
  },
  organ: {
    id: "organ",
    label: "Orgue",
    description: "Son tenu qui ne s'éteint pas : pratique pour vérifier une note longue.",
    config: { osc: "square", osc2: "sine", osc2Gain: 0.6, cutoff: 2600, attack: 0.02, sustain: 1, release: 0.12, gain: 0.28 },
  },
  flute: {
    id: "flute",
    label: "Flûte",
    description: "Doux et tenu, avec un léger vibrato. Proche d'une voix, moins fatigant à l'oreille.",
    config: { osc: "sine", osc2: "triangle", osc2Gain: 0.18, cutoff: 2200, attack: 0.09, sustain: 1, release: 0.2, vibratoRate: 5, vibratoDepth: 12, vibratoDelay: 0.5, gain: 0.42 },
  },
  sine: {
    id: "sine",
    label: "Son pur",
    description: "Une seule fréquence, sans harmonique. C'est le plus net pour entendre si tu es juste.",
    config: { osc: "sine", cutoff: 8000, attack: 0.02, sustain: 1, release: 0.18, gain: 0.45 },
  },
};

export const INSTRUMENT_IDS = Object.keys(INSTRUMENTS) as InstrumentId[];
export const DEFAULT_INSTRUMENT: InstrumentId = "piano";

// ------------------------------------------------------------------------ voix

export type VoiceSetId = "voix" | "droite" | "cordes" | "orgue" | "bouche" | "identiques";

export interface VoiceSetPreset {
  id: VoiceSetId;
  label: string;
  description: string;
  parts: Record<VoicePartId, TimbreConfig>;
}

/** Construit les quatre pupitres à partir d'un timbre commun et de réglages propres à chaque voix. */
function buildParts(
  base: Omit<TimbreConfig, "cutoff" | "gain">,
  perPart: Record<VoicePartId, { cutoff: number; gain: number; vibratoRate?: number }>,
): Record<VoicePartId, TimbreConfig> {
  const out = {} as Record<VoicePartId, TimbreConfig>;
  for (const part of VOICE_PARTS) {
    out[part] = { ...base, ...perPart[part] };
  }
  return out;
}

export const VOICE_SETS: Record<VoiceSetId, VoiceSetPreset> = {
  voix: {
    id: "voix",
    label: "Voix synthétiques",
    description: "Timbre par défaut, avec un léger vibrato. Le plus proche d'un vrai chœur.",
    parts: buildParts(
      { osc: "sawtooth", osc2: "triangle", osc2Gain: 0.55, attack: 0.08, release: 0.15, vibratoDepth: 22, vibratoDelay: 0.6 },
      {
        S: { cutoff: 2600, gain: 0.22, vibratoRate: 5.5 },
        A: { cutoff: 1900, gain: 0.24, vibratoRate: 5 },
        T: { cutoff: 1500, gain: 0.3, vibratoRate: 5.2 },
        B: { cutoff: 900, gain: 0.3, vibratoRate: 4.8 },
      },
    ),
  },
  droite: {
    id: "droite",
    label: "Voix droites",
    description: "Sans vibrato. La hauteur est parfaitement stable, donc les écarts de justesse s'entendent tout de suite.",
    parts: buildParts(
      { osc: "sawtooth", osc2: "triangle", osc2Gain: 0.5, attack: 0.07, release: 0.15 },
      {
        S: { cutoff: 2500, gain: 0.22 },
        A: { cutoff: 1850, gain: 0.24 },
        T: { cutoff: 1450, gain: 0.3 },
        B: { cutoff: 880, gain: 0.3 },
      },
    ),
  },
  cordes: {
    id: "cordes",
    label: "Cordes",
    description: "Attaque douce et son nourri. Les lignes se fondent, ce qui rapproche des conditions réelles.",
    parts: buildParts(
      { osc: "sawtooth", osc2: "sawtooth", osc2Gain: 0.45, detune2: 9, attack: 0.16, release: 0.3, vibratoDepth: 14, vibratoDelay: 0.8 },
      {
        S: { cutoff: 2400, gain: 0.2, vibratoRate: 4.6 },
        A: { cutoff: 1800, gain: 0.22, vibratoRate: 4.4 },
        T: { cutoff: 1400, gain: 0.27, vibratoRate: 4.5 },
        B: { cutoff: 850, gain: 0.27, vibratoRate: 4.2 },
      },
    ),
  },
  orgue: {
    id: "orgue",
    label: "Orgue",
    description: "Chaque pupitre reste très lisible. C'est le réglage le plus facile pour repérer ta ligne.",
    parts: buildParts(
      { osc: "square", osc2: "sine", osc2Gain: 0.55, attack: 0.03, sustain: 1, release: 0.1 },
      {
        S: { cutoff: 2800, gain: 0.16 },
        A: { cutoff: 2000, gain: 0.17 },
        T: { cutoff: 1600, gain: 0.21 },
        B: { cutoff: 950, gain: 0.2 },
      },
    ),
  },
  bouche: {
    id: "bouche",
    label: "Bouche fermée",
    description: "Chœur qui bourdonne, très doux. Reposant quand tu répètes longtemps la même ligne.",
    parts: buildParts(
      { osc: "sine", osc2: "triangle", osc2Gain: 0.3, attack: 0.12, release: 0.25, vibratoDepth: 10, vibratoDelay: 0.7 },
      {
        S: { cutoff: 1400, gain: 0.26, vibratoRate: 5.2 },
        A: { cutoff: 1150, gain: 0.28, vibratoRate: 5 },
        T: { cutoff: 950, gain: 0.32, vibratoRate: 5 },
        B: { cutoff: 700, gain: 0.32, vibratoRate: 4.6 },
      },
    ),
  },
  identiques: {
    id: "identiques",
    label: "Voix identiques",
    description: "Les quatre pupitres ont exactement le même timbre. Rien ne t'aide à distinguer ta ligne : c'est le réglage le plus exigeant.",
    parts: buildParts(
      { osc: "sawtooth", osc2: "triangle", osc2Gain: 0.5, attack: 0.08, release: 0.15, vibratoRate: 5.1, vibratoDepth: 20, vibratoDelay: 0.6 },
      {
        S: { cutoff: 1800, gain: 0.26 },
        A: { cutoff: 1800, gain: 0.26 },
        T: { cutoff: 1800, gain: 0.26 },
        B: { cutoff: 1800, gain: 0.26 },
      },
    ),
  },
};

export const VOICE_SET_IDS = Object.keys(VOICE_SETS) as VoiceSetId[];
export const DEFAULT_VOICE_SET: VoiceSetId = "voix";

// --------------------------------------------------------------- rôles fixes

/** Le clic du métronome ne dépend d'aucun réglage : il doit rester net et reconnaissable. */
const CLICK: TimbreConfig = { osc: "square", cutoff: 3000, attack: 0.001, release: 0.03, gain: 0.3 };

/**
 * Le bourdon suit l'instrument choisi, mais toujours tenu et sans vibrato :
 * c'est une référence de hauteur, elle ne doit ni s'éteindre ni onduler.
 */
export function droneFrom(instrument: TimbreConfig): TimbreConfig {
  return {
    ...instrument,
    attack: Math.max(instrument.attack, 0.25),
    decay: 0,
    sustain: 1,
    release: Math.max(instrument.release, 0.35),
    vibratoRate: undefined,
    vibratoDepth: undefined,
    gain: instrument.gain * 0.75,
  };
}

export function isInstrumentId(value: unknown): value is InstrumentId {
  return typeof value === "string" && value in INSTRUMENTS;
}

export function isVoiceSetId(value: unknown): value is VoiceSetId {
  return typeof value === "string" && value in VOICE_SETS;
}

/** Résout le timbre effectif d'un rôle, selon les préférences sonores. */
export function resolveTimbre(role: Role, instrument: InstrumentId, voiceSet: VoiceSetId): TimbreConfig {
  if (role === "click") return CLICK;
  const instrumentConfig = INSTRUMENTS[instrument]?.config ?? INSTRUMENTS[DEFAULT_INSTRUMENT].config;
  if (role === "piano") return instrumentConfig;
  if (role === "drone") return droneFrom(instrumentConfig);
  const set = VOICE_SETS[voiceSet] ?? VOICE_SETS[DEFAULT_VOICE_SET];
  return set.parts[role];
}
