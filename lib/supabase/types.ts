/** Représentation des lignes de la base, alignée sur supabase/migrations/0001_init.sql. */

export interface ProfileRow {
  user_id: string;
  display_name: string | null;
  /** Pupitre déclaré, « unknown » compris. Jamais une conclusion de l'application. */
  declared_part: string;
  /** Ligne SATB travaillée. */
  choir_line: string;
  range_from_assessment: boolean;
  low_note: number;
  high_note: number;
  preferred_duration: number;
  level: number;
  manual_level: number | null;
  onboarded: boolean;
  volume: number;
  created_at: string;
  updated_at: string;
}

export interface SkillRow {
  user_id: string;
  skill_id: string;
  feedback_history: number[];
  exercises_done: number;
  updated_at: string;
}

export interface SessionRow {
  id: string;
  user_id: string;
  date: string;
  planned_duration: number;
  level: number;
  seed: number;
  exercises: unknown;
  started_at: string | null;
  completed_at: string | null;
  total_duration: number;
  updated_at: string;
}

export interface AchievementRow {
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

/** Une tentative vocale. Append-only : jamais modifiée, seulement ajoutée ou oubliée. */
export interface ObservationRow {
  id: string;
  user_id: string;
  target_midi: number;
  detected_midi: number | null;
  spread_cents: number;
  held_seconds: number;
  clarity: number;
  comfort: string | null;
  source: string;
  observed_at: string;
}

export interface RemoteBundle {
  profile: ProfileRow | null;
  skills: SkillRow[];
  sessions: SessionRow[];
  achievements: AchievementRow[];
  observations: ObservationRow[];
}
