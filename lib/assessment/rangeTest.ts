import type { Comfort, VocalObservation } from "@/lib/vocal/types";

/**
 * Machine à états du test d'étendue vocale.
 *
 * Entièrement pure : l'interface fournit le résultat de chaque note, la machine
 * décide de la suivante. Cela la rend testable sans micro ni navigateur, et cela
 * garantit que les règles d'arrêt sont au même endroit plutôt que dispersées dans
 * des gestionnaires d'événements.
 *
 * Le test ne cherche pas la note extrême. Il s'arrête dès que deux tentatives
 * consécutives échouent, et immédiatement si l'utilisateur signale une gêne.
 */

/** Bornes utiles du détecteur de hauteur (≈ 60 Hz – 1200 Hz). */
export const FLOOR_MIDI = 36; // Do2
export const CEIL_MIDI = 86; // Ré6

/** Garde-fou : un test qui dépasse ce nombre de notes a forcément déraillé. */
export const MAX_STEPS = 60;

export type RangeTestPhase = "prepare" | "center" | "down" | "up" | "verify" | "done";

export type StepOutcome =
  | { kind: "sung"; observation: VocalObservation }
  | { kind: "unclear" }
  | { kind: "uncomfortable"; observation?: VocalObservation }
  | { kind: "skip" };

export interface RangeTestState {
  phase: RangeTestPhase;
  /** Note à chanter maintenant. */
  target: number;
  /** Note de départ, déduite du pupitre déclaré ou du profil précédent. */
  center: number;
  observations: VocalObservation[];
  /** Note la plus grave validée jusqu'ici. */
  lowEdge: number | null;
  /** Note la plus aiguë validée jusqu'ici. */
  highEdge: number | null;
  /** Échecs consécutifs dans la direction courante. */
  fails: number;
  /** Vrai quand on affine d'un demi-ton après un premier échec. */
  refining: boolean;
  /** Notes restant à demander dans les phases à liste fixe. */
  queue: number[];
  steps: number;
  /** Renseigné quand une direction s'est arrêtée sur une gêne déclarée. */
  stoppedEarly: boolean;
}

export interface RangeTestOptions {
  /** Note médiane de départ. */
  center: number;
}

export function createRangeTest({ center }: RangeTestOptions): RangeTestState {
  const c = clampMidi(center);
  return {
    phase: "prepare",
    target: c,
    center: c,
    observations: [],
    lowEdge: null,
    highEdge: null,
    fails: 0,
    refining: false,
    queue: [c, clampMidi(c - 2), clampMidi(c + 2)],
    steps: 0,
    stoppedEarly: false,
  };
}

function clampMidi(midi: number): number {
  return Math.min(CEIL_MIDI, Math.max(FLOOR_MIDI, Math.round(midi)));
}

/** Passe de l'écran de préparation à la première note. */
export function beginRangeTest(state: RangeTestState): RangeTestState {
  if (state.phase !== "prepare") return state;
  const [first, ...rest] = state.queue;
  return { ...state, phase: "center", target: first ?? state.center, queue: rest };
}

/** Le confort est demandé partout sauf pendant la mise en voix centrale. */
export function shouldAskComfort(state: RangeTestState): boolean {
  return state.phase === "down" || state.phase === "up";
}

function startDown(state: RangeTestState): RangeTestState {
  const from = state.lowEdge ?? state.center;
  const next = from - 2;
  if (next < FLOOR_MIDI) return startUp(state);
  return { ...state, phase: "down", target: next, fails: 0, refining: false };
}

function startUp(state: RangeTestState): RangeTestState {
  const from = state.highEdge ?? state.center;
  const next = from + 2;
  if (next > CEIL_MIDI) return startVerify(state);
  return { ...state, phase: "up", target: next, fails: 0, refining: false };
}

/**
 * Vérification : quelques notes redemandées une seconde fois.
 * Une réussite unique ne suffit pas à déclarer une note fiable (§5 du cahier des
 * charges) ; on revient donc sur les bords et sur le centre.
 */
function startVerify(state: RangeTestState): RangeTestState {
  const candidates = [state.lowEdge, state.center, state.highEdge]
    .filter((m): m is number => m !== null)
    .map((m, i, arr) => {
      // On évite les bords absolus : on vérifie un demi-ton à l'intérieur.
      if (i === 0 && arr.length > 1) return m + 1;
      if (i === arr.length - 1 && arr.length > 1) return m - 1;
      return m;
    });

  const queue = [...new Set(candidates.map(clampMidi))].filter((m) => m >= FLOOR_MIDI && m <= CEIL_MIDI);
  if (queue.length === 0) return { ...state, phase: "done", queue: [] };
  const [first, ...rest] = queue;
  return { ...state, phase: "verify", target: first, queue: rest, fails: 0, refining: false };
}

function withObservation(state: RangeTestState, outcome: StepOutcome): RangeTestState {
  const observation = outcome.kind === "sung" ? outcome.observation : outcome.kind === "uncomfortable" ? outcome.observation : undefined;
  if (!observation) return state;
  return { ...state, observations: [...state.observations, observation] };
}

function recordSuccess(state: RangeTestState): RangeTestState {
  return {
    ...state,
    lowEdge: state.lowEdge === null ? state.target : Math.min(state.lowEdge, state.target),
    highEdge: state.highEdge === null ? state.target : Math.max(state.highEdge, state.target),
  };
}

/**
 * Note suivante après le résultat de la note courante.
 *
 * Descente et montée suivent la même règle : deux demi-tons par pas tant que ça
 * passe ; au premier échec on retente un demi-ton en deçà ; au second on arrête
 * cette direction. Une gêne déclarée arrête la direction immédiatement, sans
 * proposer de reprendre plus loin.
 */
export function advanceRangeTest(state: RangeTestState, outcome: StepOutcome): RangeTestState {
  if (state.phase === "done" || state.phase === "prepare") return state;

  let s = withObservation(state, outcome);
  s = { ...s, steps: s.steps + 1 };
  if (s.steps >= MAX_STEPS) return { ...s, phase: "done", queue: [] };

  const success = outcome.kind === "sung";
  const uncomfortable = outcome.kind === "uncomfortable";

  switch (s.phase) {
    case "center": {
      if (success) s = recordSuccess(s);
      if (s.queue.length > 0) {
        const [next, ...rest] = s.queue;
        return { ...s, target: next, queue: rest };
      }
      return startDown(s);
    }

    case "down": {
      if (uncomfortable) return startUp({ ...s, stoppedEarly: true });
      if (success) {
        s = recordSuccess({ ...s, fails: 0 });
        const step = s.refining ? 1 : 2;
        const next = s.target - step;
        if (next < FLOOR_MIDI) return startUp(s);
        return { ...s, target: next };
      }
      // Échec : on retente un demi-ton plus haut, puis on renonce.
      const fails = s.fails + 1;
      if (fails >= 2) return startUp({ ...s, fails });
      const retry = s.target + 1;
      if (s.lowEdge !== null && retry >= s.lowEdge) return startUp({ ...s, fails });
      return { ...s, fails, refining: true, target: retry };
    }

    case "up": {
      if (uncomfortable) return startVerify({ ...s, stoppedEarly: true });
      if (success) {
        s = recordSuccess({ ...s, fails: 0 });
        const step = s.refining ? 1 : 2;
        const next = s.target + step;
        if (next > CEIL_MIDI) return startVerify(s);
        return { ...s, target: next };
      }
      const fails = s.fails + 1;
      if (fails >= 2) return startVerify({ ...s, fails });
      const retry = s.target - 1;
      if (s.highEdge !== null && retry <= s.highEdge) return startVerify({ ...s, fails });
      return { ...s, fails, refining: true, target: retry };
    }

    case "verify": {
      if (success) s = recordSuccess(s);
      if (s.queue.length > 0) {
        const [next, ...rest] = s.queue;
        return { ...s, target: next, queue: rest };
      }
      return { ...s, phase: "done", queue: [] };
    }

    default:
      return s;
  }
}

/** Arrêt volontaire : ce qui a été chanté jusque-là reste exploitable. */
export function stopRangeTest(state: RangeTestState): RangeTestState {
  return { ...state, phase: "done", queue: [] };
}

/** Avancement estimé, uniquement pour la barre de progression. */
export function rangeTestProgress(state: RangeTestState): number {
  const weights: Record<RangeTestPhase, [number, number]> = {
    prepare: [0, 0.05],
    center: [0.05, 0.2],
    down: [0.2, 0.55],
    up: [0.55, 0.88],
    verify: [0.88, 1],
    done: [1, 1],
  };
  const [start, end] = weights[state.phase];
  if (state.phase === "center" || state.phase === "verify") {
    const remaining = state.queue.length;
    const span = end - start;
    return start + span * (1 - remaining / Math.max(1, remaining + 1));
  }
  if (state.phase === "down" || state.phase === "up") {
    const travelled = Math.abs(state.target - state.center);
    return start + (end - start) * Math.min(1, travelled / 14);
  }
  return start;
}

export const PHASE_TITLE: Record<RangeTestPhase, string> = {
  prepare: "Préparation",
  center: "Zone centrale",
  down: "Exploration du grave",
  up: "Exploration de l'aigu",
  verify: "Vérification",
  done: "Terminé",
};

export const PHASE_HINT: Record<RangeTestPhase, string> = {
  prepare: "On commence en douceur, dans une zone confortable.",
  center: "Quelques notes au milieu de ta voix, pour établir un repère.",
  down: "On descend progressivement. Aucune obligation d'aller au plus bas.",
  up: "On monte progressivement. Arrête dès que ça tire.",
  verify: "On revient sur quelques notes pour confirmer.",
  done: "Merci, c'est terminé.",
};

export const COMFORT_OPTIONS: Array<{ value: Comfort; emoji: string; label: string }> = [
  { value: "easy", emoji: "😌", label: "Facile" },
  { value: "ok", emoji: "🙂", label: "Ça va" },
  { value: "strained", emoji: "😖", label: "Ça tire" },
  { value: "impossible", emoji: "🚫", label: "Impossible" },
];
