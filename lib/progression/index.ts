import type { Level, Recommendation, Session, SkillId, SkillState } from "@/lib/types";
import { LEVELS, SKILLS, SKILL_ORDER } from "@/lib/skills";
import { addDays, average, clamp, toDayKey } from "@/lib/utils";
import { EMPTY_MEASURED, MEASURED_SKILL_IDS, TREND_MIN_DELTA, describeMeasured, type MeasuredSkillId, type MeasuredSkills } from "./measured";
import { practiceOf, type Practice } from "./practice";

export {
  EMPTY_MEASURED,
  MEASURED_SKILL_IDS,
  MIN_MEASURED_SAMPLES,
  describeMeasured,
  describeTrend,
  isMeasuredSkill,
  measureSkills,
  measuredHistory,
} from "./measured";
export type { MeasuredSkill, MeasuredSkillId, MeasuredSkills, MeasuredWeek } from "./measured";
export { practiceOf, practiceStanding } from "./practice";
export type { Practice, SkillPractice } from "./practice";

/**
 * Deux natures de compétence, volontairement séparées.
 *
 * - Ce que le micro **mesure** (justesse, stabilité) vit dans `measured.ts` :
 *   recalculé depuis les observations, il monte et descend.
 * - Ce qui a été **pratiqué** vit dans `practice.ts` : un décompte, qui ne fait
 *   que monter, et qui est présenté comme tel.
 *
 * Il n'existe plus de « score » par compétence : c'était un compteur de
 * pratique modulé par le ressenti déclaré, affiché en pourcentage, qui ne
 * pouvait pas baisser. Il ne mesurait pas la voix et laissait croire l'inverse.
 */
export function initialSkills(): Record<SkillId, SkillState> {
  const out = {} as Record<SkillId, SkillState>;
  for (const id of Object.keys(SKILLS) as SkillId[]) {
    out[id] = { feedbackHistory: [], exercisesDone: 0 };
  }
  return out;
}

export interface LevelRequirement {
  sessions: number;
  /** Seuils 0–100 sur les compétences mesurées. Sans mesure suffisante, le seuil n'est pas atteint. */
  measured: Partial<Record<MeasuredSkillId, number>>;
  /** Exercices terminés dans les compétences que rien ne mesure. */
  practice: Partial<Record<SkillId, number>>;
}

export const LEVEL_REQUIREMENTS: Record<2 | 3 | 4, LevelRequirement> = {
  2: { sessions: 8, measured: { stability: 40, pitch: 40 }, practice: { breathing: 6 } },
  3: { sessions: 20, measured: { pitch: 50 }, practice: { registers: 6, musicality: 6, melody: 6 } },
  4: { sessions: 35, measured: { pitch: 60, stability: 55 }, practice: { choir: 8, melody: 10 } },
};

export function completedSessions(sessions: Session[]): Session[] {
  return sessions.filter((s) => !!s.completedAt);
}

function requirementMet(req: LevelRequirement, done: number, measured: MeasuredSkills, practice: Practice): boolean {
  if (done < req.sessions) return false;
  for (const [id, min] of Object.entries(req.measured) as Array<[MeasuredSkillId, number]>) {
    const value = measured[id].value;
    if (value === null || value < min) return false;
  }
  for (const [id, min] of Object.entries(req.practice) as Array<[SkillId, number]>) {
    if (practice[id].exercises < min) return false;
  }
  return true;
}

/**
 * Niveau que les données justifient aujourd'hui.
 *
 * Les seuils mesurés exigent une mesure : sans micro, on ne franchit pas un
 * palier de justesse, même après cent séances. C'est le prix pour que le niveau
 * veuille dire quelque chose.
 */
export function computeLevel(skills: Record<SkillId, SkillState>, sessions: Session[], measured: MeasuredSkills = EMPTY_MEASURED): Level {
  const done = completedSessions(sessions).length;
  const practice = practiceOf(skills, sessions);
  let level: Level = 1;
  for (const target of [2, 3, 4] as const) {
    if (requirementMet(LEVEL_REQUIREMENTS[target], done, measured, practice)) level = target;
    else break;
  }
  return level;
}

export interface LevelDetail {
  label: string;
  /** Null quand la compétence n'est pas encore mesurable. */
  current: number | null;
  target: number;
  kind: "sessions" | "measured" | "practice";
}

/** « de respiration », « d'articulation ». */
function ofSkill(id: SkillId): string {
  const label = SKILLS[id].label.toLowerCase();
  return /^[aeiouyéèêàh]/.test(label) ? `d'${label}` : `de ${label}`;
}

/** Progression (0–1) vers le niveau suivant, détail par critère. */
export function levelProgress(
  level: Level,
  skills: Record<SkillId, SkillState>,
  sessions: Session[],
  measured: MeasuredSkills = EMPTY_MEASURED,
): { ratio: number; details: LevelDetail[] } {
  if (level >= 4) return { ratio: 1, details: [] };
  const req = LEVEL_REQUIREMENTS[(level + 1) as 2 | 3 | 4];
  const done = completedSessions(sessions).length;
  const practice = practiceOf(skills, sessions);
  const details: LevelDetail[] = [
    { label: "Séances terminées", current: done, target: req.sessions, kind: "sessions" },
    ...(Object.entries(req.measured) as Array<[MeasuredSkillId, number]>).map(([id, min]) => ({
      label: `${SKILLS[id].label} mesurée`,
      current: measured[id].value,
      target: min,
      kind: "measured" as const,
    })),
    ...(Object.entries(req.practice) as Array<[SkillId, number]>).map(([id, min]) => ({
      label: `Exercices ${ofSkill(id)}`,
      current: practice[id].exercises,
      target: min,
      kind: "practice" as const,
    })),
  ];
  const ratio = average(details.map((d) => clamp((d.current ?? 0) / d.target, 0, 1)));
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
export function buildRecommendations(
  skills: Record<SkillId, SkillState>,
  sessions: Session[],
  level: Level,
  measured: MeasuredSkills = EMPTY_MEASURED,
  today: string = toDayKey(),
): Recommendation[] {
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

  // Ce que le micro mesure, dans les deux sens. Un recul est une information,
  // pas un reproche : on le dit, on l'explique, on adapte.
  for (const id of MEASURED_SKILL_IDS) {
    const m = measured[id];
    const label = SKILLS[id].label;
    if (m.delta !== null && m.delta <= -TREND_MIN_DELTA) {
      recs.push({
        id: `drop-${id}`,
        title: `${label} mesurée : en recul`,
        message: `${m.delta} points depuis trois semaines. ${describeMeasured(m)} Fatigue, pièce plus bruyante ou notes plus difficiles suffisent à l'expliquer. Les prochaines séances y reviennent avec des exercices plus simples.`,
        skill: id,
        tone: "warning",
      });
    } else if (m.delta !== null && m.delta >= TREND_MIN_DELTA) {
      recs.push({
        id: `rise-${id}`,
        title: `${label} mesurée : en progrès`,
        message: `+${m.delta} points depuis trois semaines. ${describeMeasured(m)} C'est mesuré, pas déclaré.`,
        skill: id,
        tone: "success",
      });
    }
  }

  // Sans mesure, aucune compétence ne peut évoluer : on le rappelle une fois la
  // routine installée, pas dès la première séance.
  if (done.length >= 2 && MEASURED_SKILL_IDS.some((id) => measured[id].value === null)) {
    recs.push({
      id: "measure",
      title: "Mesure ta voix",
      message:
        "Justesse et stabilité ne se chiffrent qu'au micro. Active-le sur « Trouve la note » ou sur une note tenue : six mesures suffisent pour un premier chiffre, qui pourra monter comme descendre.",
      tone: "info",
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

  // Compétence mesurée la plus faible parmi celles du niveau
  const weakMeasured = MEASURED_SKILL_IDS.filter((id) => LEVELS[level].focus.includes(id) && measured[id].value !== null && (measured[id].value as number) < 40);
  if (weakMeasured.length > 0) {
    const id = weakMeasured.sort((a, b) => (measured[a].value as number) - (measured[b].value as number))[0];
    recs.push({
      id: `focus-${id}`,
      title: "Cette semaine",
      message: `${SKILLS[id].label} mesurée à ${measured[id].value}. ${describeMeasured(measured[id])} Les prochaines séances y consacrent davantage de temps.`,
      skill: id,
      tone: "info",
    });
  }

  // Niveau proche
  const lp = levelProgress(level, skills, sessions, measured);
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
  check: (ctx: { sessions: Session[]; skills: Record<SkillId, SkillState>; streak: number; level: Level; measured: MeasuredSkills; practice: Practice }) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-session", title: "Première séance", description: "Une séance terminée.", emoji: "🎤", check: (c) => completedSessions(c.sessions).length >= 1 },
  { id: "five-sessions", title: "Cinq séances", description: "Cinq séances terminées.", emoji: "🖐️", check: (c) => completedSessions(c.sessions).length >= 5 },
  { id: "streak-3", title: "Trois jours de suite", description: "Série de 3 jours.", emoji: "🔥", check: (c) => c.streak >= 3 },
  { id: "streak-7", title: "Une semaine", description: "Série de 7 jours.", emoji: "🏆", check: (c) => c.streak >= 7 },
  { id: "hour", title: "Une heure", description: "60 minutes d'entraînement cumulées.", emoji: "⏱️", check: (c) => totalTrainingTime(c.sessions) >= 3600 },
  { id: "five-hours", title: "Cinq heures", description: "5 heures d'entraînement cumulées.", emoji: "⌛", check: (c) => totalTrainingTime(c.sessions) >= 5 * 3600 },
  // Les identifiants historiques sont conservés pour ne pas orpheliner les objectifs déjà obtenus.
  { id: "breath-50", title: "Souffle posé", description: "Dix exercices de respiration.", emoji: "🌬️", check: (c) => c.practice.breathing.exercises >= 10 },
  { id: "pitch-50", title: "Oreille éveillée", description: "Justesse mesurée à 50.", emoji: "🎯", check: (c) => (c.measured.pitch.value ?? 0) >= 50 },
  { id: "stability-50", title: "Note droite", description: "Stabilité mesurée à 50.", emoji: "📏", check: (c) => (c.measured.stability.value ?? 0) >= 50 },
  { id: "level-2", title: "Coordination", description: "Niveau 2 atteint.", emoji: "🥈", check: (c) => c.level >= 2 },
  { id: "level-3", title: "Indépendance", description: "Niveau 3 atteint.", emoji: "🥇", check: (c) => c.level >= 3 },
  { id: "level-4", title: "Choriste autonome", description: "Niveau 4 atteint.", emoji: "👑", check: (c) => c.level >= 4 },
];
