"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Achievement, AppData, Feedback, Level, Session, SkillId, SkillState, UserProfile } from "@/lib/types";
import { getExercise } from "@/data/exercises";
import { generateSession } from "@/lib/routine/generator";
import { ACHIEVEMENTS, computeLevel, computeStreak, initialSkills, scoreGain } from "@/lib/progression";
import { DEFAULT_TENOR_RANGE } from "@/lib/audio/notes";
import { STORAGE_KEY, localStorageAdapter } from "@/lib/storage";
import { clamp, hashString, toDayKey } from "@/lib/utils";

export function defaultProfile(): UserProfile {
  return {
    voiceType: "tenor",
    lowNote: DEFAULT_TENOR_RANGE.low,
    highNote: DEFAULT_TENOR_RANGE.high,
    preferredDuration: 20 * 60,
    level: 1,
    onboarded: false,
    createdAt: new Date().toISOString(),
    volume: 0.8,
  };
}

export interface AppState extends AppData {
  hydrated: boolean;
  setHydrated: () => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  completeOnboarding: (patch: Partial<UserProfile>) => void;
  /** Retourne la séance du jour (la crée si nécessaire). */
  ensureTodaySession: (duration?: number) => Session;
  regenerateSession: (duration?: number) => Session;
  startSession: () => void;
  recordExercise: (index: number, data: { feedback?: Feedback; actualDuration: number; skipped?: boolean }) => void;
  finishSession: () => Session | null;
  abandonSession: () => void;
  effectiveLevel: () => Level;
  importData: (data: AppData) => void;
  resetAll: () => void;
}

function effectiveLevelOf(profile: UserProfile, skills: Record<SkillId, SkillState>, sessions: Session[]): Level {
  return profile.manualLevel ?? computeLevel(skills, sessions);
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      profile: defaultProfile(),
      skills: initialSkills(),
      sessions: [],
      currentSession: null,
      achievements: [],
      hydrated: false,

      setHydrated: () => set({ hydrated: true }),

      updateProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),

      completeOnboarding: (patch) => set((s) => ({ profile: { ...s.profile, ...patch, onboarded: true } })),

      effectiveLevel: () => {
        const s = get();
        return effectiveLevelOf(s.profile, s.skills, s.sessions);
      },

      ensureTodaySession: (duration) => {
        const s = get();
        const today = toDayKey();
        const wanted = duration ?? s.profile.preferredDuration;
        const level = effectiveLevelOf(s.profile, s.skills, s.sessions);
        // Une séance en cours (démarrée) d'aujourd'hui est conservée même si la durée ou le niveau change.
        if (s.currentSession && s.currentSession.date === today && s.currentSession.startedAt) {
          return s.currentSession;
        }
        if (s.currentSession && s.currentSession.date === today && s.currentSession.plannedDuration === wanted && s.currentSession.level === level) {
          return s.currentSession;
        }
        const session = generateSession({
          duration: wanted,
          level,
          skills: s.skills,
          history: s.sessions,
          date: today,
        });
        set({ currentSession: session });
        return session;
      },

      regenerateSession: (duration) => {
        const s = get();
        const today = toDayKey();
        const wanted = duration ?? s.currentSession?.plannedDuration ?? s.profile.preferredDuration;
        const prevSeed = s.currentSession?.seed ?? 0;
        const session = generateSession({
          duration: wanted,
          level: effectiveLevelOf(s.profile, s.skills, s.sessions),
          skills: s.skills,
          history: s.sessions,
          date: today,
          seed: hashString(`${prevSeed}-${Date.now()}`),
        });
        set({ currentSession: session });
        return session;
      },

      startSession: () =>
        set((s) => (s.currentSession && !s.currentSession.startedAt ? { currentSession: { ...s.currentSession, startedAt: new Date().toISOString() } } : {})),

      recordExercise: (index, data) =>
        set((s) => {
          if (!s.currentSession) return {};
          const exercises = s.currentSession.exercises.map((e, i) =>
            i === index
              ? { ...e, feedback: data.feedback ?? e.feedback, actualDuration: data.actualDuration, completed: !data.skipped, skipped: !!data.skipped }
              : e,
          );
          const skills = { ...s.skills };
          const target = exercises[index];
          const exercise = getExercise(target.exerciseId);
          if (exercise && data.feedback && !data.skipped) {
            const prev = skills[exercise.category];
            const gain = scoreGain(exercise, data.feedback, prev.score, data.actualDuration);
            skills[exercise.category] = {
              score: clamp(prev.score + gain, 0, 100),
              feedbackHistory: [...prev.feedbackHistory, data.feedback].slice(-10),
              exercisesDone: prev.exercisesDone + 1,
            };
          }
          return { currentSession: { ...s.currentSession, exercises }, skills };
        }),

      finishSession: () => {
        const s = get();
        if (!s.currentSession) return null;
        const total = s.currentSession.exercises.reduce((a, e) => a + (e.actualDuration ?? 0), 0);
        const finished: Session = { ...s.currentSession, completedAt: new Date().toISOString(), totalDuration: total };
        const sessions = [...s.sessions.filter((x) => x.id !== finished.id), finished];
        const level = effectiveLevelOf(s.profile, s.skills, sessions);
        const streak = computeStreak(sessions);
        const already = new Set(s.achievements.map((a) => a.id));
        const newAch: Achievement[] = ACHIEVEMENTS.filter((a) => !already.has(a.id) && a.check({ sessions, skills: s.skills, streak, level })).map((a) => ({
          id: a.id,
          unlockedAt: new Date().toISOString(),
        }));
        set({
          sessions,
          currentSession: null,
          achievements: [...s.achievements, ...newAch],
          profile: { ...s.profile, level },
        });
        return finished;
      },

      abandonSession: () => set({ currentSession: null }),

      importData: (data) =>
        set({
          profile: { ...defaultProfile(), ...data.profile },
          skills: { ...initialSkills(), ...data.skills },
          sessions: data.sessions ?? [],
          currentSession: data.currentSession ?? null,
          achievements: data.achievements ?? [],
        }),

      resetAll: () => set({ profile: defaultProfile(), skills: initialSkills(), sessions: [], currentSession: null, achievements: [] }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorageAdapter),
      partialize: (s) => ({ profile: s.profile, skills: s.skills, sessions: s.sessions, currentSession: s.currentSession, achievements: s.achievements }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

export function exportData(state: AppState): AppData {
  return { profile: state.profile, skills: state.skills, sessions: state.sessions, currentSession: state.currentSession, achievements: state.achievements };
}
