import type { AppData, Achievement, Session, SkillId, SkillState, UserProfile } from "@/lib/types";
import { SKILLS } from "@/lib/skills";
import { trimObservations } from "@/lib/vocal/observations";
import type { VocalObservation } from "@/lib/vocal/types";

/**
 * Fusion de deux instantanés de progression, l'un local, l'autre distant.
 *
 * Règle générale : la version dont l'horodatage `updatedAt` est le plus récent gagne.
 * Les horodatages proviennent des appareils, pas du serveur ; c'est volontaire, puisqu'il
 * s'agit de départager deux modifications faites par la même personne. Une horloge
 * d'appareil très décalée fausserait l'arbitrage, ce qui reste sans gravité ici.
 *
 * Ces fonctions sont pures : aucun accès au réseau ni au store.
 */

const EPOCH = "1970-01-01T00:00:00.000Z";

function stamp(value?: string): string {
  return value && value.length > 0 ? value : EPOCH;
}

/** Vrai si `a` est au moins aussi récent que `b`. */
function atLeastAsRecent(a?: string, b?: string): boolean {
  return stamp(a) >= stamp(b);
}

export function mergeProfile(local: UserProfile, remote: UserProfile | null): UserProfile {
  if (!remote) return local;
  const winner = atLeastAsRecent(local.updatedAt, remote.updatedAt) ? local : remote;
  return {
    ...winner,
    // L'onboarding ne se « dé-fait » pas : s'il a été franchi sur un appareil, il l'est partout.
    onboarded: local.onboarded || remote.onboarded,
    // On conserve la date de création la plus ancienne.
    createdAt: stamp(local.createdAt) <= stamp(remote.createdAt) ? local.createdAt : remote.createdAt,
    displayName: winner.displayName ?? local.displayName ?? remote.displayName,
  };
}

export function mergeSkills(
  local: Record<SkillId, SkillState>,
  remote: Partial<Record<SkillId, SkillState>>,
): Record<SkillId, SkillState> {
  const out = {} as Record<SkillId, SkillState>;
  for (const id of Object.keys(SKILLS) as SkillId[]) {
    const l = local[id];
    const r = remote[id];
    if (!r) {
      out[id] = l;
      continue;
    }
    if (!l) {
      out[id] = r;
      continue;
    }
    if (stamp(l.updatedAt) === stamp(r.updatedAt)) {
      // Égalité d'horodatage : on garde la trace la plus fournie plutôt que d'en perdre.
      out[id] = l.exercisesDone >= r.exercisesDone ? l : r;
    } else {
      out[id] = atLeastAsRecent(l.updatedAt, r.updatedAt) ? l : r;
    }
  }
  return out;
}

/** Fusionne deux listes de séances par identifiant. */
export function mergeSessions(local: Session[], remote: Session[]): Session[] {
  const byId = new Map<string, Session>();
  for (const s of remote) byId.set(s.id, s);
  for (const s of local) {
    const other = byId.get(s.id);
    if (!other || atLeastAsRecent(s.updatedAt, other.updatedAt)) byId.set(s.id, s);
  }
  return [...byId.values()].sort((a, b) => (a.date === b.date ? stamp(a.updatedAt).localeCompare(stamp(b.updatedAt)) : a.date.localeCompare(b.date)));
}

/**
 * Union des observations vocales.
 *
 * Elles ne sont jamais modifiées après coup : une tentative appartient à un
 * instant précis. Une fusion par identifiant suffit donc, sans arbitrage — et
 * c'est ce qui permet à deux appareils d'enrichir le même profil sans que l'un
 * efface le travail de l'autre.
 */
export function mergeObservations(local: VocalObservation[] = [], remote: VocalObservation[] = []): VocalObservation[] {
  const byId = new Map<string, VocalObservation>();
  for (const o of [...(remote ?? []), ...(local ?? [])]) byId.set(o.id, o);
  return trimObservations([...byId.values()]);
}

/** Union des objectifs ; en cas de doublon, on retient la première obtention. */
export function mergeAchievements(local: Achievement[], remote: Achievement[]): Achievement[] {
  const byId = new Map<string, Achievement>();
  for (const a of [...remote, ...local]) {
    const other = byId.get(a.id);
    if (!other || stamp(a.unlockedAt) < stamp(other.unlockedAt)) byId.set(a.id, a);
  }
  return [...byId.values()].sort((a, b) => stamp(a.unlockedAt).localeCompare(stamp(b.unlockedAt)));
}

/**
 * Sépare les séances en « terminées ou passées » et « séance du jour en cours ».
 * Une seule séance en cours est retenue : la plus récemment modifiée parmi celles du jour.
 */
export function splitCurrent(sessions: Session[], today: string): { sessions: Session[]; currentSession: Session | null } {
  let current: Session | null = null;
  const rest: Session[] = [];
  for (const s of sessions) {
    const isOpenToday = !s.completedAt && s.date === today;
    if (!isOpenToday) {
      rest.push(s);
      continue;
    }
    if (!current || atLeastAsRecent(s.updatedAt, current.updatedAt)) {
      if (current) rest.push(current);
      current = s;
    } else {
      rest.push(s);
    }
  }
  return { sessions: rest, currentSession: current };
}

/**
 * État tel qu'il revient de la base : le profil peut manquer, les compétences
 * peuvent être incomplètes, et la séance en cours n'est qu'une séance non terminée.
 */
export interface RemoteSnapshot {
  profile: UserProfile | null;
  skills: Partial<Record<SkillId, SkillState>>;
  sessions: Session[];
  achievements: Achievement[];
  observations: VocalObservation[];
}

/** Fusionne l'état local et l'état distant en un seul instantané cohérent. */
export function mergeSnapshots(local: AppData, remote: RemoteSnapshot, today: string): AppData {
  const allLocal = local.currentSession ? [...local.sessions, local.currentSession] : local.sessions;
  const merged = mergeSessions(allLocal, remote.sessions);
  const { sessions, currentSession } = splitCurrent(merged, today);
  return {
    profile: mergeProfile(local.profile, remote.profile),
    skills: mergeSkills(local.skills, remote.skills),
    sessions,
    currentSession,
    achievements: mergeAchievements(local.achievements, remote.achievements),
    observations: mergeObservations(local.observations, remote.observations),
  };
}
