import type { ChoirLine, DeclaredPart, VocalObservation } from "@/lib/vocal/types";

export type SkillId =
  | "breathing"
  | "warmup"
  | "pitch"
  | "stability"
  | "articulation"
  | "registers"
  | "melody"
  | "choir"
  | "musicality";

export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type Level = 1 | 2 | 3 | 4;
export type Feedback = 1 | 2 | 3 | 4 | 5;

/** Widgets interactifs disponibles dans le lecteur d'exercice. */
export type InteractiveSpec =
  | { type: "breathing"; inhale: number; hold: number; exhale: number; rest?: number }
  | { type: "metronome"; bpm: number; beatsPerBar?: number }
  | { type: "drone"; /** offset en demi-tons depuis la note basse confortable */ offsetFromLow?: number }
  | { type: "pitch-match"; range?: "low" | "mid" | "full" }
  | { type: "compare" }
  | { type: "sustain"; seconds: number }
  | { type: "interval"; intervals: number[] }
  | { type: "scale"; pattern: ScalePatternId; bpm?: number; /** décalage en demi-tons du point de départ par rapport à la note basse confortable */ startOffset?: number }
  | { type: "melody"; melodyId: string }
  | { type: "choir"; pieceId: string; listenOnly?: boolean; others?: ChoirVoicing; myVolume?: number; transpose?: number }
  | { type: "piano" };

/**
 * Quelles autres voix accompagnent la ligne travaillée.
 *
 * Exprimé en rôles et non en lettres SATB : un exercice « ma ligne face à la voix
 * qui attire l'oreille » doit rester le même exercice, que l'utilisateur chante
 * ténor ou basse. Les rôles sont résolus dans `lib/vocal/voiceParts.ts`.
 */
export type ChoirVoicing = "none" | "support" | "attractor" | "except-attractor" | "all";

export type ScalePatternId = "three" | "scale5" | "scale8" | "arpeggio" | "siren" | "thirds";

export interface Exercise {
  id: string;
  name: string;
  category: SkillId;
  objective: string;
  why: string;
  instructions: string[];
  focusPoints: string[];
  commonMistakes: string[];
  safetyNotes: string[];
  /** Durée de référence en secondes. */
  duration: number;
  minDuration?: number;
  maxDuration?: number;
  repetitions?: number;
  difficulty: Difficulty;
  level: Level;
  prerequisites?: string[];
  interactive?: InteractiveSpec;
  tags?: string[];
  /** Exercice utilisable en retour au calme. */
  cooldown?: boolean;
}

export interface SessionExercise {
  exerciseId: string;
  plannedDuration: number;
  actualDuration?: number;
  feedback?: Feedback;
  completed: boolean;
  skipped: boolean;
}

export interface Session {
  id: string;
  /** Date ISO (jour) de la séance : YYYY-MM-DD */
  date: string;
  plannedDuration: number;
  level: Level;
  exercises: SessionExercise[];
  startedAt?: string;
  completedAt?: string;
  /** Temps réellement passé, en secondes. */
  totalDuration: number;
  /** Graine utilisée pour la génération (permet de régénérer). */
  seed: number;
  /** Dernière modification locale (ISO). Sert à départager les appareils lors de la synchronisation. */
  updatedAt?: string;
}

export interface SkillState {
  score: number;
  /** Dix derniers ressentis, le plus récent en dernier. */
  feedbackHistory: Feedback[];
  /** Nombre d'exercices réalisés dans cette compétence. */
  exercisesDone: number;
  /** Dernière modification locale (ISO). */
  updatedAt?: string;
}

export interface UserProfile {
  /**
   * Pupitre déclaré par l'utilisateur.
   *
   * C'est une information de contexte, jamais une vérité vocale : elle sert à
   * amorcer le test d'étendue et à choisir la ligne travaillée, et n'entre dans
   * aucun calcul de profil vocal. Ce que les données indiquent vit dans
   * `VocalAnalysis`, dérivé des observations.
   */
  declaredPart: DeclaredPart;
  /** Ligne travaillée dans les exercices choraux. Modifiable indépendamment du pupitre. */
  choirLine: ChoirLine;
  /** Nom affiché, repris du compte Google ou saisi à l'inscription. */
  displayName?: string;
  /** Note MIDI la plus basse de la zone de travail. */
  lowNote: number;
  /** Note MIDI la plus haute de la zone de travail. */
  highNote: number;
  /** Vrai quand la zone de travail vient d'une évaluation plutôt que d'un réglage manuel. */
  rangeFromAssessment?: boolean;
  preferredDuration: number;
  level: Level;
  manualLevel?: Level;
  onboarded: boolean;
  createdAt: string;
  volume: number;
  /** Dernière modification locale (ISO). */
  updatedAt?: string;
}

export interface Achievement {
  id: string;
  unlockedAt: string;
}

export interface AppData {
  profile: UserProfile;
  skills: Record<SkillId, SkillState>;
  sessions: Session[];
  currentSession: Session | null;
  achievements: Achievement[];
  /**
   * Tentatives vocales observées. Seule matière première du profil vocal :
   * les bandes, estimations et niveaux de confiance en sont recalculés à
   * chaque affichage, jamais stockés.
   */
  observations: VocalObservation[];
}

export interface Recommendation {
  id: string;
  title: string;
  message: string;
  skill?: SkillId;
  tone: "info" | "success" | "warning";
}
