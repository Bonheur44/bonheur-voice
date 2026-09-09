import type { Exercise } from "@/lib/types";
import { CHOIR_LINES, choirRoles } from "@/lib/vocal/voiceParts";
import type { ChoirLine } from "@/lib/vocal/types";

/**
 * Personnalisation des textes d'exercice selon la ligne travaillée.
 *
 * Les exercices choraux raisonnent en rôles : « ma ligne », « la voix qui attire
 * l'oreille », « la voix d'appui ». Écrire ces rôles en dur — soprano, basse —
 * reviendrait à maintenir quatre versions du même exercice et à disperser dans le
 * contenu une logique qui n'a rien à y faire. Les marqueurs sont résolus ici, à
 * l'affichage.
 *
 * Marqueurs disponibles :
 *   {{me}}          ma ligne, en minuscules      → « ténor »
 *   {{Me}}          ma ligne, capitalisée        → « Ténor »
 *   {{attractor}}   la voix qui attire l'oreille → « soprano »
 *   {{Attractor}}                                → « Soprano »
 *   {{support}}     la voix d'appui              → « basse »
 *   {{Support}}                                  → « Basse »
 */

const MARKER = /\{\{(\w+)\}\}/g;

function lower(value: string): string {
  return value.toLocaleLowerCase("fr-FR");
}

export function replacements(line: ChoirLine): Record<string, string> {
  const { attractor, support } = choirRoles(line);
  const me = CHOIR_LINES[line].label;
  const att = CHOIR_LINES[attractor].label;
  const sup = CHOIR_LINES[support].label;
  return {
    me: lower(me),
    Me: me,
    attractor: lower(att),
    Attractor: att,
    support: lower(sup),
    Support: sup,
  };
}

export function personalizeText(text: string, line: ChoirLine): string {
  const map = replacements(line);
  return text.replace(MARKER, (whole, key: string) => map[key] ?? whole);
}

/** Vrai si l'exercice contient au moins un marqueur à résoudre. */
export function hasMarkers(exercise: Exercise): boolean {
  MARKER.lastIndex = 0;
  return (
    MARKER.test(exercise.name) ||
    MARKER.test(exercise.objective) ||
    MARKER.test(exercise.why) ||
    exercise.instructions.some((i) => i.includes("{{"))
  );
}

/**
 * Renvoie l'exercice avec ses textes résolus.
 * Les exercices sans marqueur sont renvoyés inchangés, ce qui évite de recréer
 * inutilement des objets à chaque rendu.
 */
export function personalizeExercise(exercise: Exercise, line: ChoirLine): Exercise {
  if (!hasMarkers(exercise)) return exercise;
  const t = (s: string) => personalizeText(s, line);
  return {
    ...exercise,
    name: t(exercise.name),
    objective: t(exercise.objective),
    why: t(exercise.why),
    instructions: exercise.instructions.map(t),
    focusPoints: exercise.focusPoints.map(t),
    commonMistakes: exercise.commonMistakes.map(t),
    safetyNotes: exercise.safetyNotes.map(t),
  };
}
