import { describe, expect, it } from "vitest";
import { initialSkills } from "@/lib/progression";
import { mergeAchievements, mergeProfile, mergeSessions, mergeSkills, mergeSnapshots, splitCurrent, type RemoteSnapshot } from "@/lib/sync/merge";
import { isWorthSyncing, profileFromRow, profileToRow, sessionFromRow, sessionToRow, skillsFromRows, skillsToRows } from "@/lib/sync/rows";
import { defaultProfile } from "@/lib/store";
import type { AppData, Session, SkillId, SkillState, UserProfile } from "@/lib/types";

const OLD = "2026-09-01T10:00:00.000Z";
const NEW = "2026-09-08T10:00:00.000Z";
const TODAY = "2026-09-09";

function profile(patch: Partial<UserProfile> = {}): UserProfile {
  return { ...defaultProfile(), ...patch };
}

function session(id: string, patch: Partial<Session> = {}): Session {
  return { id, date: TODAY, plannedDuration: 900, level: 1, exercises: [], totalDuration: 0, seed: 1, ...patch };
}

function emptyRemote(patch: Partial<RemoteSnapshot> = {}): RemoteSnapshot {
  return { profile: null, skills: {}, sessions: [], achievements: [], observations: [], ...patch };
}

function localData(patch: Partial<AppData> = {}): AppData {
  return { profile: profile(), skills: initialSkills(), sessions: [], currentSession: null, achievements: [], observations: [], ...patch };
}

describe("mergeProfile", () => {
  it("retient la version la plus récemment modifiée", () => {
    const local = profile({ preferredDuration: 600, updatedAt: NEW });
    const remote = profile({ preferredDuration: 2700, updatedAt: OLD });
    expect(mergeProfile(local, remote).preferredDuration).toBe(600);
    expect(mergeProfile(profile({ preferredDuration: 600, updatedAt: OLD }), profile({ preferredDuration: 2700, updatedAt: NEW })).preferredDuration).toBe(2700);
  });

  it("laisse gagner le distant face à un profil local jamais modifié", () => {
    // Cas d'une première connexion sur un nouvel appareil.
    const fresh = profile();
    const remote = profile({ lowNote: 50, highNote: 70, onboarded: true, updatedAt: OLD });
    const merged = mergeProfile(fresh, remote);
    expect(merged.lowNote).toBe(50);
    expect(merged.onboarded).toBe(true);
  });

  it("ne défait jamais l'onboarding", () => {
    const local = profile({ onboarded: false, updatedAt: NEW });
    const remote = profile({ onboarded: true, updatedAt: OLD });
    expect(mergeProfile(local, remote).onboarded).toBe(true);
  });

  it("conserve la date de création la plus ancienne", () => {
    const local = profile({ createdAt: NEW, updatedAt: NEW });
    const remote = profile({ createdAt: OLD, updatedAt: OLD });
    expect(mergeProfile(local, remote).createdAt).toBe(OLD);
  });

  it("garde le profil local en l'absence de profil distant", () => {
    const local = profile({ preferredDuration: 600 });
    expect(mergeProfile(local, null)).toEqual(local);
  });
});

describe("mergeSkills", () => {
  const withSkill = (id: SkillId, patch: Partial<SkillState>): Record<SkillId, SkillState> => {
    const base = initialSkills();
    base[id] = { ...base[id], ...patch };
    return base;
  };

  it("retient la compétence la plus récemment modifiée", () => {
    const local = withSkill("pitch", { exercisesDone: 55, updatedAt: NEW });
    const remote = withSkill("pitch", { exercisesDone: 20, updatedAt: OLD });
    expect(mergeSkills(local, remote).pitch.exercisesDone).toBe(55);
    expect(mergeSkills(withSkill("pitch", { exercisesDone: 55, updatedAt: OLD }), withSkill("pitch", { exercisesDone: 20, updatedAt: NEW })).pitch.exercisesDone).toBe(20);
  });

  it("à horodatage égal, conserve la trace la plus fournie", () => {
    const local = withSkill("stability", { exercisesDone: 30, updatedAt: NEW });
    const remote = withSkill("stability", { exercisesDone: 44, updatedAt: NEW });
    expect(mergeSkills(local, remote).stability.exercisesDone).toBe(44);
  });

  it("laisse gagner le distant sur une compétence locale jamais travaillée", () => {
    const remote = withSkill("breathing", { exercisesDone: 61, updatedAt: OLD });
    expect(mergeSkills(initialSkills(), remote).breathing.exercisesDone).toBe(61);
  });

  it("garde toutes les compétences même si le distant est incomplet", () => {
    const merged = mergeSkills(initialSkills(), {});
    expect(Object.keys(merged).length).toBe(Object.keys(initialSkills()).length);
  });
});

describe("mergeSessions", () => {
  it("réunit les séances des deux côtés", () => {
    const merged = mergeSessions([session("a")], [session("b")]);
    expect(merged.map((s) => s.id).sort()).toEqual(["a", "b"]);
  });

  it("retient la version la plus récente d'une même séance", () => {
    const local = session("a", { totalDuration: 100, updatedAt: NEW });
    const remote = session("a", { totalDuration: 900, updatedAt: OLD });
    expect(mergeSessions([local], [remote])[0].totalDuration).toBe(100);
    expect(mergeSessions([session("a", { totalDuration: 100, updatedAt: OLD })], [session("a", { totalDuration: 900, updatedAt: NEW })])[0].totalDuration).toBe(900);
  });

  it("ne perd aucune séance terminée sur deux appareils différents", () => {
    const deviceA = [session("lundi", { date: "2026-09-07", completedAt: OLD, updatedAt: OLD })];
    const deviceB = [session("mardi", { date: "2026-09-08", completedAt: NEW, updatedAt: NEW })];
    expect(mergeSessions(deviceA, deviceB)).toHaveLength(2);
  });
});

describe("mergeAchievements", () => {
  it("réunit les objectifs et garde la première obtention", () => {
    const merged = mergeAchievements(
      [{ id: "streak-3", unlockedAt: NEW }, { id: "hour", unlockedAt: NEW }],
      [{ id: "streak-3", unlockedAt: OLD }],
    );
    expect(merged).toHaveLength(2);
    expect(merged.find((a) => a.id === "streak-3")?.unlockedAt).toBe(OLD);
  });
});

describe("splitCurrent", () => {
  it("isole la séance du jour non terminée", () => {
    const open = session("today", { updatedAt: NEW });
    const done = session("done", { completedAt: OLD, updatedAt: OLD });
    const result = splitCurrent([done, open], TODAY);
    expect(result.currentSession?.id).toBe("today");
    expect(result.sessions.map((s) => s.id)).toEqual(["done"]);
  });

  it("ne retient qu'une séance en cours, la plus récente", () => {
    const a = session("a", { updatedAt: OLD });
    const b = session("b", { updatedAt: NEW });
    const result = splitCurrent([a, b], TODAY);
    expect(result.currentSession?.id).toBe("b");
    expect(result.sessions).toHaveLength(1);
  });

  it("ne considère pas comme en cours une séance ouverte d'un autre jour", () => {
    const stale = session("hier", { date: "2026-09-08", updatedAt: NEW });
    expect(splitCurrent([stale], TODAY).currentSession).toBeNull();
  });
});

describe("mergeSnapshots", () => {
  it("préserve la progression du compte sur un appareil vierge", () => {
    const fresh = localData();
    const remote = emptyRemote({
      profile: profile({ onboarded: true, lowNote: 50, updatedAt: OLD }),
      skills: { pitch: { feedbackHistory: [], exercisesDone: 12, updatedAt: OLD } },
      sessions: [session("s1", { date: "2026-09-05", completedAt: OLD, updatedAt: OLD, totalDuration: 900 })],
      achievements: [{ id: "first-session", unlockedAt: OLD }],
    });

    const merged = mergeSnapshots(fresh, remote, TODAY);

    expect(merged.profile.onboarded).toBe(true);
    expect(merged.profile.lowNote).toBe(50);
    expect(merged.skills.pitch.exercisesDone).toBe(12);
    expect(merged.sessions).toHaveLength(1);
    expect(merged.achievements).toHaveLength(1);
  });

  it("conserve une séance locale absente du serveur", () => {
    const local = localData({ sessions: [session("hors-ligne", { date: "2026-09-08", completedAt: NEW, updatedAt: NEW })] });
    const merged = mergeSnapshots(local, emptyRemote(), TODAY);
    expect(merged.sessions.map((s) => s.id)).toContain("hors-ligne");
  });

  it("place la séance en cours du jour au bon endroit", () => {
    const local = localData({ currentSession: session("en-cours", { startedAt: NEW, updatedAt: NEW }) });
    const merged = mergeSnapshots(local, emptyRemote(), TODAY);
    expect(merged.currentSession?.id).toBe("en-cours");
    expect(merged.sessions).toHaveLength(0);
  });
});

describe("conversion avec les lignes de la base", () => {
  it("fait l'aller-retour sur le profil", () => {
    const original = profile({ lowNote: 49, highNote: 68, manualLevel: 3, displayName: "Bonheur", updatedAt: NEW });
    const back = profileFromRow(profileToRow(original, "u1"));
    expect(back).toMatchObject({ lowNote: 49, highNote: 68, manualLevel: 3, displayName: "Bonheur", updatedAt: NEW });
  });

  it("fait l'aller-retour sur une séance", () => {
    const original = session("s1", { startedAt: OLD, completedAt: NEW, totalDuration: 840, updatedAt: NEW });
    expect(sessionFromRow(sessionToRow(original, "u1"))).toMatchObject({ id: "s1", totalDuration: 840, completedAt: NEW });
  });

  it("fait l'aller-retour sur les compétences et ignore les identifiants inconnus", () => {
    const rows = skillsToRows(initialSkills(), "u1");
    rows.push({ user_id: "u1", skill_id: "inconnu", feedback_history: [], exercises_done: 0, updated_at: NEW });
    const back = skillsFromRows(rows);
    expect(Object.keys(back)).toHaveLength(Object.keys(initialSkills()).length);
    expect("inconnu" in back).toBe(false);
  });

  it("n'enregistre que les séances réellement commencées", () => {
    expect(isWorthSyncing(session("plan"))).toBe(false);
    expect(isWorthSyncing(session("demarree", { startedAt: NEW }))).toBe(true);
    expect(isWorthSyncing(session("finie", { completedAt: NEW }))).toBe(true);
  });
});
