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
  | { type: "choir"; pieceId: string; listenOnly?: boolean; voices?: Array<"S" | "A" | "B">; tenorVolume?: number; transpose?: number }
  | { type: "piano" };

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
}

export interface SkillState {
  score: number;
  /** Dix derniers ressentis, le plus récent en dernier. */
  feedbackHistory: Feedback[];
  /** Nombre d'exercices réalisés dans cette compétence. */
  exercisesDone: number;
}

export interface UserProfile {
  voiceType: "tenor";
  /** Note MIDI la plus basse confortable. */
  lowNote: number;
  /** Note MIDI la plus haute confortable. */
  highNote: number;
  preferredDuration: number;
  level: Level;
  manualLevel?: Level;
  onboarded: boolean;
  createdAt: string;
  volume: number;
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
}

export interface Recommendation {
  id: string;
  title: string;
  message: string;
  skill?: SkillId;
  tone: "info" | "success" | "warning";
}
