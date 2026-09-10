import type { AchievementRow, ObservationRow, ProfileRow, RemoteBundle, SessionRow, SkillRow } from "@/lib/supabase/types";
import type { AppData, Feedback, Level, Session, SessionExercise, SkillId, SkillState, UserProfile } from "@/lib/types";
import { SKILLS } from "@/lib/skills";
import { defaultLineFor, isChoirLine, isDeclaredPart } from "@/lib/vocal/voiceParts";
import type { ChoirLine, Comfort, DeclaredPart, ObservationSource, VocalObservation } from "@/lib/vocal/types";
import type { RemoteSnapshot } from "./merge";

const EPOCH = "1970-01-01T00:00:00.000Z";

function asLevel(n: number | null | undefined): Level {
  const v = Math.round(n ?? 1);
  return (v >= 1 && v <= 4 ? v : 1) as Level;
}

/**
 * Une séance mérite d'être enregistrée en base dès lors qu'elle a été commencée.
 * Les plans générés mais jamais démarrés sont regénérables : les synchroniser
 * créerait un trafic inutile à chaque ouverture de l'application.
 */
export function isWorthSyncing(session: Session): boolean {
  return !!session.startedAt || !!session.completedAt;
}

// ------------------------------------------------------------- base → application

const COMFORTS: Comfort[] = ["easy", "ok", "strained", "impossible"];
const SOURCES: ObservationSource[] = ["range-test", "pitch-test", "sustain", "exercise"];

/**
 * Le pupitre déclaré vient de la base sans être réinterprété : une valeur inconnue
 * retombe sur « unknown » plutôt que sur un pupitre choisi arbitrairement.
 */
function asDeclaredPart(value: unknown): DeclaredPart {
  return isDeclaredPart(value) ? value : "unknown";
}

function asChoirLine(value: unknown, fallback: DeclaredPart): ChoirLine {
  if (isChoirLine(value)) return value;
  return defaultLineFor(fallback);
}

export function profileFromRow(row: ProfileRow | null): UserProfile | null {
  if (!row) return null;
  const declaredPart = asDeclaredPart(row.declared_part);
  return {
    declaredPart,
    choirLine: asChoirLine(row.choir_line, declaredPart),
    rangeFromAssessment: row.range_from_assessment ?? false,
    displayName: row.display_name ?? undefined,
    lowNote: row.low_note,
    highNote: row.high_note,
    preferredDuration: row.preferred_duration,
    level: asLevel(row.level),
    manualLevel: row.manual_level === null ? undefined : asLevel(row.manual_level),
    onboarded: row.onboarded,
    createdAt: row.created_at,
    volume: row.volume,
    updatedAt: row.updated_at,
  };
}

export function skillsFromRows(rows: SkillRow[]): Partial<Record<SkillId, SkillState>> {
  const out: Partial<Record<SkillId, SkillState>> = {};
  for (const row of rows) {
    if (!(row.skill_id in SKILLS)) continue;
    out[row.skill_id as SkillId] = {
      feedbackHistory: (row.feedback_history ?? []).filter((f) => f >= 1 && f <= 5) as Feedback[],
      exercisesDone: row.exercises_done,
      updatedAt: row.updated_at,
    };
  }
  return out;
}

export function sessionFromRow(row: SessionRow): Session {
  return {
    id: row.id,
    date: row.date,
    plannedDuration: row.planned_duration,
    level: asLevel(row.level),
    exercises: Array.isArray(row.exercises) ? (row.exercises as SessionExercise[]) : [],
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    totalDuration: row.total_duration,
    seed: Number(row.seed ?? 0),
    updatedAt: row.updated_at,
  };
}

export function observationFromRow(row: ObservationRow): VocalObservation {
  const comfort = COMFORTS.find((c) => c === row.comfort);
  return {
    id: row.id,
    targetMidi: Number(row.target_midi),
    detectedMidi: row.detected_midi === null ? null : Number(row.detected_midi),
    spreadCents: Number(row.spread_cents ?? 0),
    heldSeconds: Number(row.held_seconds ?? 0),
    clarity: Number(row.clarity ?? 0),
    comfort,
    source: SOURCES.find((s) => s === row.source) ?? "exercise",
    at: row.observed_at,
  };
}

export function observationsToRows(data: AppData, userId: string): ObservationRow[] {
  return data.observations.map((o) => ({
    id: o.id,
    user_id: userId,
    target_midi: o.targetMidi,
    detected_midi: o.detectedMidi,
    spread_cents: o.spreadCents,
    held_seconds: o.heldSeconds,
    clarity: o.clarity,
    comfort: o.comfort ?? null,
    source: o.source,
    observed_at: o.at,
  }));
}

export function bundleToSnapshot(bundle: RemoteBundle): RemoteSnapshot {
  return {
    profile: profileFromRow(bundle.profile),
    skills: skillsFromRows(bundle.skills),
    sessions: bundle.sessions.map(sessionFromRow),
    achievements: bundle.achievements.map((a) => ({ id: a.achievement_id, unlockedAt: a.unlocked_at })),
    observations: bundle.observations.map(observationFromRow),
  };
}

// ------------------------------------------------------------- application → base

export function profileToRow(profile: UserProfile, userId: string): ProfileRow {
  return {
    user_id: userId,
    display_name: profile.displayName ?? null,
    declared_part: profile.declaredPart,
    choir_line: profile.choirLine,
    range_from_assessment: profile.rangeFromAssessment ?? false,
    low_note: profile.lowNote,
    high_note: profile.highNote,
    preferred_duration: profile.preferredDuration,
    level: profile.level,
    manual_level: profile.manualLevel ?? null,
    onboarded: profile.onboarded,
    volume: profile.volume,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt ?? EPOCH,
  };
}

export function skillsToRows(skills: Record<SkillId, SkillState>, userId: string): SkillRow[] {
  return (Object.keys(skills) as SkillId[]).map((id) => ({
    user_id: userId,
    skill_id: id,
    feedback_history: skills[id].feedbackHistory,
    exercises_done: skills[id].exercisesDone,
    updated_at: skills[id].updatedAt ?? EPOCH,
  }));
}

export function sessionToRow(session: Session, userId: string): SessionRow {
  return {
    id: session.id,
    user_id: userId,
    date: session.date,
    planned_duration: session.plannedDuration,
    level: session.level,
    seed: session.seed,
    exercises: session.exercises,
    started_at: session.startedAt ?? null,
    completed_at: session.completedAt ?? null,
    total_duration: session.totalDuration,
    updated_at: session.updatedAt ?? EPOCH,
  };
}

export function achievementsToRows(data: AppData, userId: string): AchievementRow[] {
  return data.achievements.map((a) => ({ user_id: userId, achievement_id: a.id, unlocked_at: a.unlockedAt }));
}

/** Toutes les séances à écrire en base : historique plus séance en cours si elle a démarré. */
export function sessionsToRows(data: AppData, userId: string): SessionRow[] {
  const all = data.currentSession ? [...data.sessions, data.currentSession] : data.sessions;
  return all.filter(isWorthSyncing).map((s) => sessionToRow(s, userId));
}
