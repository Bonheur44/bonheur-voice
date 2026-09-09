import type { Exercise, Feedback, Level, Recommendation, Session, SkillId, SkillState } from "@/lib/types";
import { LEVELS, SKILLS, SKILL_ORDER } from "@/lib/skills";
import { addDays, average, clamp, toDayKey } from "@/lib/utils";

export const FEEDBACK_FACTOR: Record<Feedback, number> = { 1: 0.6, 2: 0.85, 3: 1, 4: 1.05, 5: 0.9 };

/** Gain de score pour un exercice terminé. */
export function scoreGain(exercise: Exercise, feedback: Feedback, currentScore: number, actualDuration: number): number {
  const base = 3;
  const difficultyFactor = 0.8 + (exercise.difficulty - 1) * 0.15; // 0.8 → 1.4
  const durationFactor = clamp(actualDuration / Math.max(30, exercise.duration), 0.4, 1.2);
  let gain = base * difficultyFactor * FEEDBACK_FACTOR[feedback] * durationFactor;
  // rendement décroissant
  if (currentScore >= 70) gain *= 0.6;
  else if (currentScore >= 50) gain *= 0.8;
  return Math.round(gain * 10) / 10;
}

export function initialSkills(): Record<SkillId, SkillState> {
  const out = {} as Record<SkillId, SkillState>;
  for (const id of Object.keys(SKILLS) as SkillId[]) {
    out[id] = { score: SKILLS[id].initialScore, feedbackHistory: [], exercisesDone: 0 };
  }
  return out;
}

export interface LevelRequirement {
  skills: Partial<Record<SkillId, number>>;
  sessions: number;
}

export const LEVEL_REQUIREMENTS: Record<2 | 3 | 4, LevelRequirement> = {
  2: { skills: { breathing: 45, stability: 40, pitch: 40 }, sessions: 8 },
  3: { skills: { registers: 40, musicality: 40, melody: 40 }, sessions: 20 },
  4: { skills: { choir: 50, melody: 55, pitch: 60 }, sessions: 35 },
};

export function completedSessions(sessions: Session[]): Session[] {
  return sessions.filter((s) => !!s.completedAt);
}

/** Niveau atteint automatiquement d'après les scores et le nombre de séances. */
export function computeLevel(skills: Record<SkillId, SkillState>, sessions: Session[]): Level {
  const done = completedSessions(sessions).length;
  let level: Level = 1;
  for (const target of [2, 3, 4] as const) {
    const req = LEVEL_REQUIREMENTS[target];
    const ok = done >= req.sessions && Object.entries(req.skills).every(([id, min]) => skills[id as SkillId].score >= (min as number));
    if (ok) level = target;
    else break;
  }
  return level;
}

/** Progression (0–1) vers le niveau suivant. */
export function levelProgress(level: Level, skills: Record<SkillId, SkillState>, sessions: Session[]): { ratio: number; details: Array<{ label: string; current: number; target: number }> } {
  if (level >= 4) return { ratio: 1, details: [] };
  const req = LEVEL_REQUIREMENTS[(level + 1) as 2 | 3 | 4];
  const done = completedSessions(sessions).length;
  const details = [
    { label: "Séances terminées", current: done, target: req.sessions },
    ...Object.entries(req.skills).map(([id, min]) => ({ label: SKILLS[id as SkillId].label, current: Math.round(skills[id as SkillId].score), target: min as number })),
  ];
  const ratio = average(details.map((d) => clamp(d.current / d.target, 0, 1)));
  return { ratio, details };
}

/** Série de jours consécutifs avec une séance terminée. */
export function computeStreak(sessions: Session[], today: string = toDayKey()): number {
  const days = new Set(completedSessions(sessions).map((s) => s.date));
  if (days.size === 0) return 0;
  let cursor = today;
  if (!days.has(cursor)) {
    cursor = addDays(today, -1);
    if (!days.has(cursor)) return 0;
  }
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function totalTrainingTime(sessions: Session[]): number {
  return sessions.reduce((a, s) => a + s.totalDuration, 0);
}

export interface WeeklyStat {
  weekStart: string;
  sessions: number;
  seconds: number;
}

export function weeklyStats(sessions: Session[], weeks = 8, today: string = toDayKey()): WeeklyStat[] {
  const done = completedSessions(sessions);
  const result: WeeklyStat[] = [];
  const todayDate = new Date(today);
  const dow = (todayDate.getDay() + 6) % 7; // lundi = 0
  const thisMonday = addDays(today, -dow);
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(thisMonday, -7 * i);
    const end = addDays(start, 7);
    const inWeek = done.filter((s) => s.date >= start && s.date < end);
    result.push({ weekStart: start, sessions: inWeek.length, seconds: inWeek.reduce((a, s) => a + s.totalDuration, 0) });
  }
  return result;
}

export function dailyActivity(sessions: Session[], days = 28, today: string = toDayKey()): Array<{ date: string; seconds: number }> {
  const done = completedSessions(sessions);
  const out: Array<{ date: string; seconds: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    out.push({ date: d, seconds: done.filter((s) => s.date === d).reduce((a, s) => a + s.totalDuration, 0) });
  }
  return out;
}

/** Recommandations simples à partir de l'état. */
export function buildRecommendations(skills: Record<SkillId, SkillState>, sessions: Session[], level: Level, today: string = toDayKey()): Recommendation[] {
  const recs: Recommendation[] = [];
  const done = completedSessions(sessions);

  if (done.length === 0) {
    recs.push({
      id: "start",
      title: "Première séance",
      message: "Commence par une séance courte de 15 minutes : respiration, échauffement, deux blocs de travail et retour au calme. Le but est de sentir, pas de réussir.",
      tone: "info",
    });
    return recs;
  }

  const last = done[done.length - 1];
  const daysSince = Math.round((new Date(today).getTime() - new Date(last.date).getTime()) / 86400000);
  if (daysSince >= 3) {
    recs.push({
      id: "inactive",
      title: "Reprise en douceur",
      message: `Ta dernière séance date de ${daysSince} jours. Reprends avec une séance courte : la régularité compte plus que la durée.`,
      tone: "warning",
    });
  }

  // Compétence en difficulté
  for (const id of SKILL_ORDER) {
    const recent = skills[id].feedbackHistory.slice(-4);
    if (recent.length >= 3 && average(recent) <= 2) {
      recs.push({
        id: `hard-${id}`,
        title: `${SKILLS[id].label} : on allège`,
        message: `Tu as trouvé les derniers exercices de ${SKILLS[id].label.toLowerCase()} très difficiles. Les prochaines séances proposent des variantes plus accessibles ; la progression viendra de la répétition, pas de l'effort.`,
        skill: id,
        tone: "warning",
      });
      break;
    }
  }

  // Compétence trop facile
  for (const id of SKILL_ORDER) {
    const recent = skills[id].feedbackHistory.slice(-4);
    if (recent.length >= 3 && average(recent) >= 4.3) {
      recs.push({
        id: `easy-${id}`,
        title: `${SKILLS[id].label} : on monte d'un cran`,
        message: `Les exercices de ${SKILLS[id].label.toLowerCase()} te semblent faciles. Les prochaines séances augmentent légèrement la difficulté.`,
        skill: id,
        tone: "success",
      });
      break;
    }
  }

  // Compétence la plus faible parmi celles du niveau
  const focus = LEVELS[level].focus;
  const weakest = [...focus].sort((a, b) => skills[a].score - skills[b].score)[0];
  const strongest = [...focus].sort((a, b) => skills[b].score - skills[a].score)[0];
  if (weakest && strongest && weakest !== strongest && skills[strongest].score - skills[weakest].score >= 12) {
    recs.push({
      id: `focus-${weakest}`,
      title: "Cette semaine",
      message: `${SKILLS[strongest].label} progresse bien. Cette semaine, nous consacrons davantage de temps à ${SKILLS[weakest].label.toLowerCase()}.`,
      skill: weakest,
      tone: "info",
    });
  }

  // Niveau proche
  const lp = levelProgress(level, skills, sessions);
  if (level < 4 && lp.ratio >= 0.8) {
    recs.push({
      id: "level-soon",
      title: `Niveau ${level + 1} en vue`,
      message: `Tu approches du niveau « ${LEVELS[(level + 1) as Level].name} ». Continue à valider tes séances : le passage se fera automatiquement.`,
      tone: "success",
    });
  }

  if (recs.length === 0) {
    recs.push({
      id: "steady",
      title: "Bon rythme",
      message: "Ta progression est régulière. Garde des séances courtes mais fréquentes, et écoute toujours ta fatigue vocale.",
      tone: "success",
    });
  }
  return recs.slice(0, 3);
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  emoji: string;
  check: (ctx: { sessions: Session[]; skills: Record<SkillId, SkillState>; streak: number; level: Level }) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-session", title: "Première séance", description: "Une séance terminée.", emoji: "🎤", check: (c) => completedSessions(c.sessions).length >= 1 },
  { id: "five-sessions", title: "Cinq séances", description: "Cinq séances terminées.", emoji: "🖐️", check: (c) => completedSessions(c.sessions).length >= 5 },
  { id: "streak-3", title: "Trois jours de suite", description: "Série de 3 jours.", emoji: "🔥", check: (c) => c.streak >= 3 },
  { id: "streak-7", title: "Une semaine", description: "Série de 7 jours.", emoji: "🏆", check: (c) => c.streak >= 7 },
  { id: "hour", title: "Une heure", description: "60 minutes d'entraînement cumulées.", emoji: "⏱️", check: (c) => totalTrainingTime(c.sessions) >= 3600 },
  { id: "five-hours", title: "Cinq heures", description: "5 heures d'entraînement cumulées.", emoji: "⌛", check: (c) => totalTrainingTime(c.sessions) >= 5 * 3600 },
  { id: "breath-50", title: "Souffle posé", description: "Respiration à 50.", emoji: "🌬️", check: (c) => c.skills.breathing.score >= 50 },
  { id: "pitch-50", title: "Oreille éveillée", description: "Justesse à 50.", emoji: "🎯", check: (c) => c.skills.pitch.score >= 50 },
  { id: "stability-50", title: "Note droite", description: "Stabilité à 50.", emoji: "📏", check: (c) => c.skills.stability.score >= 50 },
  { id: "level-2", title: "Coordination", description: "Niveau 2 atteint.", emoji: "🥈", check: (c) => c.level >= 2 },
  { id: "level-3", title: "Indépendance", description: "Niveau 3 atteint.", emoji: "🥇", check: (c) => c.level >= 3 },
  { id: "level-4", title: "Choriste autonome", description: "Niveau 4 atteint.", emoji: "👑", check: (c) => c.level >= 4 },
];
