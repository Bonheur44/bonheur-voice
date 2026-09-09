import { describe, expect, it } from "vitest";
import {
  aggregateNotes,
  freshness,
  overallAccuracy,
  stabilityFromSpread,
  trimObservations,
} from "@/lib/vocal/observations";
import { analyseRange, jaccard, overlapSize, toBand } from "@/lib/vocal/rangeAnalysis";
import { dataConfidenceOf, estimateParts, evidenceVolume, isAmbiguous } from "@/lib/vocal/estimation";
import { analyseVocalProfile, describeEstimate, describeEvolution, suggestedWorkingRange } from "@/lib/vocal/profile";
import { VOICE_PARTS, VOICE_PART_IDS, choirRoles, defaultLineFor, defaultRangeFor } from "@/lib/vocal/voiceParts";
import type { Comfort, VocalObservation } from "@/lib/vocal/types";

const NOW = Date.parse("2026-09-10T12:00:00.000Z");
const daysAgo = (d: number) => new Date(NOW - d * 24 * 3600 * 1000).toISOString();

let counter = 0;
function obs(partial: Partial<VocalObservation> & { targetMidi: number }): VocalObservation {
  return {
    id: `o${counter++}`,
    detectedMidi: partial.targetMidi,
    spreadCents: 10,
    heldSeconds: 2,
    clarity: 0.95,
    source: "range-test",
    at: daysAgo(0),
    ...partial,
  };
}

/** Voix crédible : une note par demi-ton sur `band`, deux essais chacune. */
function singerObservations(low: number, high: number, comfort: Comfort = "ok", extra: Partial<VocalObservation> = {}) {
  const out: VocalObservation[] = [];
  for (let m = low; m <= high; m++) {
    out.push(obs({ targetMidi: m, comfort, ...extra }));
    out.push(obs({ targetMidi: m, comfort, ...extra }));
  }
  return out;
}

describe("pondération par la fraîcheur", () => {
  it("décroît de moitié en deux mois et ne tombe jamais à zéro avant un an", () => {
    expect(freshness(daysAgo(0), NOW)).toBeCloseTo(1, 5);
    expect(freshness(daysAgo(60), NOW)).toBeCloseTo(0.5, 2);
    expect(freshness(daysAgo(300), NOW)).toBeGreaterThan(0);
    expect(freshness(daysAgo(400), NOW)).toBe(0);
  });

  it("borne la mémoire et jette ce qui est trop vieux", () => {
    const old = obs({ targetMidi: 60, at: daysAgo(500) });
    const recent = obs({ targetMidi: 60 });
    const kept = trimObservations([old, recent], NOW);
    expect(kept).toHaveLength(1);
    expect(kept[0].id).toBe(recent.id);
  });
});

describe("stabilité", () => {
  it("est maximale sous 8 cents de dispersion et nulle au-delà de 60", () => {
    expect(stabilityFromSpread(5)).toBe(1);
    expect(stabilityFromSpread(8)).toBe(1);
    expect(stabilityFromSpread(60)).toBe(0);
    expect(stabilityFromSpread(34)).toBeCloseTo(0.5, 1);
  });
});

describe("agrégation des observations", () => {
  it("indexe sur la note produite, pas sur la note demandée", () => {
    // On demande Do3, l'utilisateur chante Do4 : c'est Do4 qu'il sait produire.
    const notes = aggregateNotes([obs({ targetMidi: 48, detectedMidi: 60 })], NOW);
    expect(notes.map((n) => n.midi)).toEqual([60]);
  });

  it("ne compte pas comme fausse une note chantée à l'octave", () => {
    const notes = aggregateNotes([obs({ targetMidi: 48, detectedMidi: 60 })], NOW);
    expect(notes[0].accuracy).toBe(1);
  });

  it("écarte les trames peu claires ou trop brèves", () => {
    expect(aggregateNotes([obs({ targetMidi: 60, clarity: 0.4 })], NOW)).toHaveLength(0);
    expect(aggregateNotes([obs({ targetMidi: 60, heldSeconds: 0.2 })], NOW)).toHaveLength(0);
  });

  it("retient tout de même une gêne déclarée sans hauteur exploitable", () => {
    const notes = aggregateNotes([obs({ targetMidi: 72, detectedMidi: null, comfort: "impossible" })], NOW);
    expect(notes).toHaveLength(1);
    expect(notes[0].midi).toBe(72);
    expect(notes[0].produced).toBe(0);
    expect(notes[0].comfort).toBe(-1);
  });

  it("mesure la justesse sur la cible et la stabilité sur la dispersion", () => {
    const { accuracy, stability, samples } = overallAccuracy(
      [obs({ targetMidi: 60, detectedMidi: 60.25, spreadCents: 8 })], // 25 cents trop haut
      NOW,
    );
    expect(samples).toBe(1);
    expect(accuracy).toBeCloseTo(0.5, 2);
    expect(stability).toBe(1);
  });

  it("ne conclut rien sans mesure", () => {
    expect(overallAccuracy([], NOW).accuracy).toBeNull();
  });
});

describe("construction des bandes", () => {
  it("garde la grappe la plus fournie et ignore une note isolée", () => {
    // Do3 isolé, puis un bloc de six notes une octave plus haut.
    expect(toBand([48, 60, 61, 62, 63, 64, 65])).toEqual({ low: 60, high: 65 });
  });

  it("ne coupe pas sur un trou tolérable", () => {
    expect(toBand([60, 62, 65, 67])).toEqual({ low: 60, high: 67 });
  });

  it("rend null sans donnée", () => {
    expect(toBand([])).toBeNull();
  });

  it("mesure le recouvrement de deux bandes", () => {
    expect(overlapSize({ low: 60, high: 70 }, { low: 65, high: 75 })).toBe(6);
    expect(overlapSize({ low: 60, high: 62 }, { low: 70, high: 75 })).toBe(0);
    expect(jaccard({ low: 60, high: 70 }, { low: 60, high: 70 })).toBe(1);
    expect(jaccard({ low: 60, high: 62 }, { low: 70, high: 75 })).toBe(0);
  });
});

describe("distinction étendue / fiable / confortable", () => {
  it("n'inclut pas dans le confortable une note déclarée pénible", () => {
    const observations = [
      ...singerObservations(55, 67, "ok"),
      ...singerObservations(68, 70, "strained"),
    ];
    const bands = analyseRange(aggregateNotes(observations, NOW));
    expect(bands.explored?.high).toBe(70);
    expect(bands.comfortable?.high).toBe(67);
  });

  it("n'inclut pas dans le fiable une note instable", () => {
    const observations = [
      ...singerObservations(55, 64),
      ...singerObservations(65, 67, "ok", { spreadCents: 90 }),
    ];
    const bands = analyseRange(aggregateNotes(observations, NOW));
    expect(bands.explored?.high).toBe(67);
    expect(bands.reliable?.high).toBe(64);
  });

  it("exclut du fiable une note systématiquement fausse", () => {
    const wrong = [1, 2].map(() => obs({ targetMidi: 67, detectedMidi: 67 + 3.2 }));
    const bands = analyseRange(aggregateNotes([...singerObservations(55, 64), ...wrong], NOW));
    expect(bands.reliable?.high).toBe(64);
  });

  it("place la zone centrale à l'intérieur de la zone confortable", () => {
    const observations = [
      ...singerObservations(50, 55, "ok", { spreadCents: 30 }),
      ...singerObservations(56, 62, "easy", { spreadCents: 5 }),
      ...singerObservations(63, 67, "ok", { spreadCents: 30 }),
    ];
    const bands = analyseRange(aggregateNotes(observations, NOW));
    expect(bands.central).not.toBeNull();
    expect(bands.central!.low).toBeGreaterThanOrEqual(bands.comfortable!.low);
    expect(bands.central!.high).toBeLessThanOrEqual(bands.comfortable!.high);
    expect(bands.central!.low).toBeGreaterThanOrEqual(55);
    expect(bands.central!.high).toBeLessThanOrEqual(63);
  });

  it("ne signale aucune transition sur une bande trop étroite", () => {
    const bands = analyseRange(aggregateNotes(singerObservations(60, 64), NOW));
    expect(bands.transitions).toEqual([]);
  });

  it("signale un creux de qualité au milieu d'une bande large", () => {
    const observations = [
      ...singerObservations(52, 59, "ok", { spreadCents: 5 }),
      ...singerObservations(60, 61, "ok", { spreadCents: 75 }),
      ...singerObservations(62, 69, "ok", { spreadCents: 5 }),
    ];
    const bands = analyseRange(aggregateNotes(observations, NOW));
    expect(bands.transitions.length).toBeGreaterThan(0);
    expect(bands.transitions[0].low).toBeGreaterThanOrEqual(59);
    expect(bands.transitions[0].high).toBeLessThanOrEqual(62);
  });
});

describe("volume de preuves", () => {
  it("refuse de conclure sur quelques notes", () => {
    const notes = aggregateNotes(singerObservations(60, 62), NOW);
    const volume = evidenceVolume(notes, { low: 60, high: 62 }, { low: 60, high: 62 });
    expect(dataConfidenceOf(volume)).toBe("insufficient");
  });

  it("monte en confiance avec l'étendue et le nombre d'essais", () => {
    const notes = aggregateNotes(singerObservations(50, 67), NOW);
    const bands = analyseRange(notes);
    const volume = evidenceVolume(notes, bands.reliable, bands.explored);
    expect(dataConfidenceOf(volume)).toBe("good");
  });
});

describe("estimation du pupitre", () => {
  it("ne publie rien tant que les données sont insuffisantes", () => {
    expect(estimateParts({ low: 60, high: 64 }, null, "insufficient")).toEqual([]);
  });

  it.each(VOICE_PART_IDS)("retrouve %s à partir de sa propre tessiture", (part) => {
    const { low, high } = VOICE_PARTS[part].comfort;
    const estimates = estimateParts({ low, high }, { low: low - 2, high: high + 2 }, "good");
    const top = estimates[0];
    // Les pupitres voisins se recouvrent largement : on exige que le bon soit en tête
    // ou à égalité, pas qu'il écrase les autres.
    const equallyGood = estimates.filter((e) => top.confidence - e.confidence < 0.06).map((e) => e.part);
    expect(equallyGood).toContain(part);
  });

  it("distingue une basse d'une soprano sans hésitation", () => {
    const bass = estimateParts({ low: 40, high: 62 }, { low: 38, high: 64 }, "good");
    expect(bass[0].part).toBe("bass");
    expect(bass.find((e) => e.part === "soprano")!.confidence).toBeLessThan(0.02);
  });

  it("annonce une ambiguïté quand deux pupitres se valent", () => {
    // Entre le ténor (48–67) et le baryton (45–65).
    const estimates = estimateParts({ low: 46, high: 66 }, { low: 44, high: 68 }, "moderate");
    expect(isAmbiguous(estimates)).toBe(true);
  });

  it("les confiances forment bien des parts d'un tout", () => {
    const estimates = estimateParts({ low: 48, high: 67 }, { low: 45, high: 70 }, "good");
    const sum = estimates.reduce((a, e) => a + e.confidence, 0);
    expect(sum).toBeCloseTo(1, 6);
  });
});

describe("analyse complète", () => {
  it("reste muette sans observation", () => {
    const analysis = analyseVocalProfile([], NOW);
    expect(analysis.dataConfidence).toBe("insufficient");
    expect(analysis.estimatedParts).toEqual([]);
    expect(describeEstimate(analysis).headline).toContain("indéterminé");
  });

  it("décrit un ténor plausible sans en faire un diagnostic", () => {
    const analysis = analyseVocalProfile(singerObservations(48, 67, "ok", { spreadCents: 6 }), NOW);
    expect(analysis.comfortable).toEqual({ low: 48, high: 67 });
    expect(analysis.dataConfidence).toBe("good");
    expect(analysis.estimatedParts[0].part).toBe("tenor");
    const described = describeEstimate(analysis);
    expect(described.headline).toMatch(/Ténor/);
    expect(described.detail).toMatch(/Estimation fondée/);
  });

  it("propose une zone de travail seulement si elle est assez large", () => {
    expect(suggestedWorkingRange(analyseVocalProfile(singerObservations(60, 62), NOW))).toBeNull();
    expect(suggestedWorkingRange(analyseVocalProfile(singerObservations(55, 70), NOW))).toEqual({ low: 55, high: 70 });
  });

  it("ne prend pas un demi-ton d'écart pour une évolution", () => {
    const before = analyseVocalProfile(singerObservations(55, 70), NOW);
    const after = analyseVocalProfile(singerObservations(55, 71), NOW);
    expect(describeEvolution(before, after)).toBeNull();
  });

  it("signale un élargissement réel vers l'aigu", () => {
    const before = analyseVocalProfile(singerObservations(55, 67), NOW);
    const after = analyseVocalProfile(singerObservations(55, 71), NOW);
    expect(describeEvolution(before, after)).toMatch(/monte maintenant/);
  });

  it("privilégie les observations récentes sur les anciennes", () => {
    const old = singerObservations(48, 55, "ok").map((o) => ({ ...o, at: daysAgo(300) }));
    const recent = singerObservations(60, 72, "ok");
    const analysis = analyseVocalProfile([...old, ...recent], NOW);
    expect(analysis.comfortable!.low).toBeGreaterThanOrEqual(60);
  });
});

describe("référentiel des pupitres", () => {
  it("décrit sept pupitres cohérents", () => {
    expect(VOICE_PART_IDS).toHaveLength(7);
    for (const id of VOICE_PART_IDS) {
      const p = VOICE_PARTS[id];
      expect(p.comfort.low).toBeLessThan(p.comfort.high);
      // L'étendue englobe la tessiture de travail : c'est ce qui les distingue.
      expect(p.extent.low).toBeLessThanOrEqual(p.comfort.low);
      expect(p.extent.high).toBeGreaterThanOrEqual(p.comfort.high);
      expect(defaultRangeFor(id)).toEqual(p.comfort);
    }
  });

  it("ordonne les pupitres du grave à l'aigu", () => {
    const centers = ["bass", "baritone", "tenor", "alto", "soprano"] as const;
    const values = centers.map((id) => (VOICE_PARTS[id].comfort.low + VOICE_PARTS[id].comfort.high) / 2);
    expect([...values].sort((a, b) => a - b)).toEqual(values);
  });

  it("donne une ligne SATB à chaque pupitre, y compris à qui ne sait pas", () => {
    expect(defaultLineFor("unknown")).toBe("T");
    expect(defaultLineFor("soprano")).toBe("S");
    expect(defaultLineFor("bass")).toBe("B");
  });

  it("désigne pour chaque ligne la voix qui attire et celle qui soutient", () => {
    expect(choirRoles("T")).toEqual({ attractor: "S", support: "B", inner: true });
    expect(choirRoles("S")).toEqual({ attractor: "A", support: "B", inner: false });
    expect(choirRoles("B")).toEqual({ attractor: "S", support: "T", inner: false });
    // Personne n'est sa propre voix attirante ni son propre soutien.
    for (const line of ["S", "A", "T", "B"] as const) {
      const roles = choirRoles(line);
      expect(roles.attractor).not.toBe(line);
      expect(roles.support).not.toBe(line);
    }
  });
});
