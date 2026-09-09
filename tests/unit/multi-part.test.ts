import { describe, expect, it } from "vitest";
import { hasMarkers, personalizeExercise, personalizeText, replacements } from "@/lib/exercises/personalize";
import { independenceSteps, voicingToVolumes } from "@/lib/vocal/choirVoicing";
import { CHOIR_LINE_IDS, choirRoles } from "@/lib/vocal/voiceParts";
import { isMyLineId, resolveMelody } from "@/data/music/myLine";
import { CHORALES } from "@/data/music/chorale";
import { EXERCISES, getExercise } from "@/data/exercises";
import { MELODIES_BY_ID } from "@/data/music/melodies";
import type { ChoirLine } from "@/lib/vocal/types";

describe("personnalisation des textes d'exercice", () => {
  it("remplace les marqueurs par les noms de voix de la ligne travaillée", () => {
    expect(personalizeText("Ma ligne de {{me}} face à {{attractor}}.", "T")).toBe("Ma ligne de ténor face à soprano.");
    expect(personalizeText("{{Support}} te soutient.", "T")).toBe("Basse te soutient.");
  });

  it("laisse intact un marqueur inconnu plutôt que de l'effacer", () => {
    expect(personalizeText("Reste {{inconnu}} ici.", "T")).toBe("Reste {{inconnu}} ici.");
  });

  it("donne un jeu de remplacements cohérent pour chaque ligne", () => {
    for (const line of CHOIR_LINE_IDS) {
      const map = replacements(line);
      expect(map.me).not.toBe(map.attractor);
      expect(map.me).not.toBe(map.support);
      expect(map.Me[0]).toBe(map.Me[0].toUpperCase());
    }
  });

  it("ne recrée pas d'objet quand il n'y a rien à remplacer", () => {
    const plain = EXERCISES.find((e) => !hasMarkers(e))!;
    expect(personalizeExercise(plain, "S")).toBe(plain);
  });

  it("résout tous les champs textuels d'un exercice choral", () => {
    const exercise = getExercise("choir-duo-attractor")!;
    const resolved = personalizeExercise(exercise, "B");
    const fields = [resolved.name, resolved.objective, resolved.why, ...resolved.instructions, ...resolved.focusPoints, ...resolved.commonMistakes];
    expect(fields.some((f) => f.includes("{{"))).toBe(false);
    expect(resolved.name).toContain("soprano");
  });

  it("ne laisse aucun marqueur non résolu dans tout le catalogue", () => {
    for (const line of CHOIR_LINE_IDS) {
      for (const exercise of EXERCISES) {
        const resolved = personalizeExercise(exercise, line);
        const all = [resolved.name, resolved.objective, resolved.why, ...resolved.instructions, ...resolved.focusPoints, ...resolved.commonMistakes, ...resolved.safetyNotes];
        for (const text of all) expect(text, `${exercise.id}/${line}`).not.toContain("{{");
      }
    }
  });

  it("aucun exercice ne nomme un pupitre en dur dans sa consigne chorale", () => {
    for (const exercise of EXERCISES.filter((e) => e.category === "choir")) {
      const raw = [exercise.name, exercise.objective, exercise.why, ...exercise.instructions].join(" ").toLowerCase();
      for (const word of ["ténor", "soprano", "alto", "basse"]) {
        expect(raw, `${exercise.id} mentionne « ${word} »`).not.toContain(word);
      }
    }
  });
});

describe("distribution des voix", () => {
  it("met toujours la ligne travaillée au volume demandé", () => {
    for (const line of CHOIR_LINE_IDS) {
      expect(voicingToVolumes(line, "all", 0.3)[line]).toBe(0.3);
      expect(voicingToVolumes(line, "none", 1)[line]).toBe(1);
    }
  });

  it("« seul » ne fait sonner que ma ligne", () => {
    const volumes = voicingToVolumes("A", "none", 1);
    expect(Object.entries(volumes).filter(([, v]) => v > 0)).toHaveLength(1);
  });

  it("« toutes » fait sonner les quatre voix", () => {
    const volumes = voicingToVolumes("T", "all", 1);
    expect(Object.values(volumes).every((v) => v > 0)).toBe(true);
  });

  it("« sans la voix qui attire » retire exactement celle-là", () => {
    for (const line of CHOIR_LINE_IDS) {
      const { attractor } = choirRoles(line);
      const volumes = voicingToVolumes(line, "except-attractor", 0.5);
      expect(volumes[attractor], line).toBe(0);
      expect(volumes[line], line).toBe(0.5);
    }
  });

  it("les cinq étapes vont de « ma ligne seule » à « ma ligne retirée »", () => {
    for (const line of CHOIR_LINE_IDS) {
      const steps = independenceSteps(line);
      expect(steps).toHaveLength(5);
      expect(steps[0].volumes[line]).toBe(1);
      expect(steps[4].volumes[line]).toBe(0);
      // La dernière étape fait bien chanter les autres.
      const others = CHOIR_LINE_IDS.filter((l) => l !== line);
      expect(others.every((l) => steps[4].volumes[l] > 0), line).toBe(true);
    }
  });
});

describe("mélodie « ma ligne »", () => {
  it("reconnaît les identifiants virtuels", () => {
    expect(isMyLineId("my-line-full")).toBe(true);
    expect(isMyLineId("phrase-vowels")).toBe(false);
  });

  it("renvoie les mélodies ordinaires telles quelles", () => {
    expect(resolveMelody("phrase-vowels", "T")).toBe(MELODIES_BY_ID["phrase-vowels"]);
  });

  it("extrait la ligne demandée du choral, pour les quatre voix", () => {
    for (const line of CHOIR_LINE_IDS as ChoirLine[]) {
      const melody = resolveMelody("my-line-full", line);
      expect(melody, line).toBeDefined();
      const notes = melody!.phrases.flatMap((p) => p.notes);
      const expected = CHORALES["chorale-1"].parts[line];
      expect(notes.map((n) => n.midi), line).toEqual(expected.map((n) => n.midi));
    }
  });

  it("donne des lignes réellement différentes selon le pupitre", () => {
    const soprano = resolveMelody("my-line-full", "S")!.phrases.flatMap((p) => p.notes.map((n) => n.midi));
    const bass = resolveMelody("my-line-full", "B")!.phrases.flatMap((p) => p.notes.map((n) => n.midi));
    expect(soprano).not.toEqual(bass);
    // La soprano chante bien au-dessus de la basse.
    expect(Math.min(...(soprano as number[]))).toBeGreaterThan(Math.max(...(bass as number[])) - 12);
  });

  it("découpe les deux phrases et y attache les paroles", () => {
    const first = resolveMelody("my-line-1", "A")!;
    const second = resolveMelody("my-line-2", "A")!;
    expect(first.phrases).toHaveLength(1);
    expect(second.phrases).toHaveLength(1);
    expect(first.phrases[0].notes[0].lyric).toBe("Chan");
    expect(second.phrases[0].notes.at(-1)?.lyric).toBe("loin.");
    // Une respiration est prévue à la fin de chaque phrase.
    expect(first.phrases[0].notes.at(-1)?.breath).toBe(true);
  });

  it("ignore un identifiant de pièce inconnu au lieu de planter", () => {
    expect(resolveMelody("my-line-full", "T", "inexistant")).toBeUndefined();
  });
});

describe("compatibilité de l'historique", () => {
  it("retrouve les exercices sous leur ancien identifiant", () => {
    expect(getExercise("choir-duo-bass")?.id).toBe("choir-duo-support");
    expect(getExercise("mel-tenor-full")?.id).toBe("mel-my-line-full");
  });

  it("renvoie undefined pour un identifiant réellement inconnu", () => {
    expect(getExercise("nexiste-pas")).toBeUndefined();
  });

  it("chaque prérequis désigne un exercice existant", () => {
    for (const exercise of EXERCISES) {
      for (const id of exercise.prerequisites ?? []) {
        expect(getExercise(id), `${exercise.id} → ${id}`).toBeDefined();
      }
    }
  });

  it("chaque mélodie référencée est résoluble", () => {
    for (const exercise of EXERCISES) {
      if (exercise.interactive?.type !== "melody") continue;
      expect(resolveMelody(exercise.interactive.melodyId, "T"), exercise.id).toBeDefined();
    }
  });

  it("chaque pièce chorale référencée existe", () => {
    for (const exercise of EXERCISES) {
      if (exercise.interactive?.type !== "choir") continue;
      expect(CHORALES[exercise.interactive.pieceId], exercise.id).toBeDefined();
    }
  });
});
