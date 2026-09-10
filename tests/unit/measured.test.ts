import { describe, expect, it } from "vitest";
import {
  MIN_MEASURED_SAMPLES,
  describeMeasured,
  describeTrend,
  measureSkills,
  measuredHistory,
  pitchScoreFromCents,
  stabilityScoreFromSpread,
} from "@/lib/progression/measured";
import { median, observationFrom, robustSpreadCents, summarizeFrames } from "@/lib/vocal/capture";
import type { VocalObservation } from "@/lib/vocal/types";

const NOW = Date.parse("2026-09-10T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

let counter = 0;
function obs(daysAgo: number, cents: number, spread = 10, extra: Partial<VocalObservation> = {}): VocalObservation {
  return {
    id: `o${counter++}`,
    targetMidi: 60,
    detectedMidi: 60 + cents / 100,
    spreadCents: spread,
    heldSeconds: 1,
    clarity: 0.95,
    source: "pitch-test",
    at: new Date(NOW - daysAgo * DAY).toISOString(),
    ...extra,
  };
}
const many = (count: number, daysAgo: number, cents: number, spread = 10) => Array.from({ length: count }, (_, i) => obs(daysAgo + i * 0.001, cents, spread));

describe("échelles", () => {
  it("place la justesse entre l'inaudible et la fausse note", () => {
    expect(pitchScoreFromCents(0)).toBe(100);
    expect(pitchScoreFromCents(5)).toBe(100);
    expect(pitchScoreFromCents(60)).toBe(0);
    expect(pitchScoreFromCents(32.5)).toBe(50);
    expect(pitchScoreFromCents(20)).toBeGreaterThan(pitchScoreFromCents(30));
  });

  it("suit la même courbe de stabilité que le profil vocal", () => {
    expect(stabilityScoreFromSpread(8)).toBe(100);
    expect(stabilityScoreFromSpread(60)).toBe(0);
    expect(stabilityScoreFromSpread(20)).toBeGreaterThan(stabilityScoreFromSpread(40));
  });
});

describe("measureSkills", () => {
  it("ne donne aucun chiffre sous le seuil de mesures", () => {
    const m = measureSkills(many(MIN_MEASURED_SAMPLES - 1, 0, 10), NOW);
    expect(m.pitch.value).toBeNull();
    expect(m.pitch.samples).toBe(MIN_MEASURED_SAMPLES - 1);
    expect(m.pitch.confidence).toBe("insufficient");
    expect(describeMeasured(m.pitch)).toContain("encore 1");
  });

  it("chiffre la justesse à partir de l'écart moyen, et le dit en cents", () => {
    const m = measureSkills(many(8, 0, 20), NOW);
    expect(m.pitch.cents).toBeCloseTo(20, 5);
    expect(m.pitch.value).toBe(pitchScoreFromCents(20));
    expect(describeMeasured(m.pitch)).toContain("±20 cents");
  });

  it("chiffre la stabilité à partir de la dérive", () => {
    const m = measureSkills(many(8, 0, 0, 30), NOW);
    expect(m.stability.cents).toBeCloseTo(30, 5);
    expect(m.stability.value).toBe(stabilityScoreFromSpread(30));
  });

  it("ignore ce qui n'est pas une hauteur tenue", () => {
    const base = many(8, 0, 10);
    const noise = [obs(0, 50, 10, { detectedMidi: null }), obs(0, 50, 10, { heldSeconds: 0.2 }), obs(0, 50, 10, { clarity: 0.5 })];
    expect(measureSkills([...base, ...noise], NOW).pitch.samples).toBe(8);
    expect(measureSkills([...base, ...noise], NOW).pitch.cents).toBeCloseTo(10, 5);
  });

  it("tolère l'octave : chanter une octave plus bas n'est pas chanter faux", () => {
    const m = measureSkills(many(8, 0, 0).map((o) => ({ ...o, detectedMidi: 48 })), NOW);
    expect(m.pitch.cents).toBeCloseTo(0, 5);
  });

  it("baisse quand les mesures récentes sont moins bonnes", () => {
    const good = many(10, 40, 10);
    const before = measureSkills(good, NOW).pitch.value as number;
    const after = measureSkills([...good, ...many(10, 0, 40)], NOW).pitch;
    expect(after.value).not.toBeNull();
    expect(after.value as number).toBeLessThan(before);
    // Et la tendance le dit : la valeur d'il y a trois semaines est meilleure.
    expect(after.previous).not.toBeNull();
    expect(after.delta as number).toBeLessThan(0);
    expect(describeTrend(after)?.direction).toBe("down");
  });

  it("monte quand les mesures récentes sont meilleures", () => {
    const m = measureSkills([...many(10, 40, 40), ...many(10, 0, 10)], NOW).pitch;
    expect(m.delta as number).toBeGreaterThan(0);
    expect(describeTrend(m)?.direction).toBe("up");
  });

  it("ne compare pas à un passé qui n'a pas été mesuré", () => {
    const m = measureSkills(many(10, 0, 10), NOW).pitch;
    expect(m.value).not.toBeNull();
    expect(m.previous).toBeNull();
    expect(m.delta).toBeNull();
    expect(describeTrend(m)).toBeNull();
  });

  it("oublie ce qui a plus d'un an", () => {
    expect(measureSkills(many(10, 400, 10), NOW).pitch.samples).toBe(0);
  });

  it("gradue la fiabilité sur le nombre de mesures", () => {
    expect(measureSkills(many(6, 0, 10), NOW).pitch.confidence).toBe("low");
    expect(measureSkills(many(15, 0, 10), NOW).pitch.confidence).toBe("moderate");
    expect(measureSkills(many(40, 0, 10), NOW).pitch.confidence).toBe("good");
  });
});

describe("measuredHistory", () => {
  const TODAY = "2026-09-10"; // un jeudi ; la semaine commence le lundi 7

  it("rend autant de semaines que demandé, la dernière étant la semaine en cours", () => {
    const h = measuredHistory([], 6, TODAY);
    expect(h).toHaveLength(6);
    expect(h[5].weekStart).toBe("2026-09-07");
    expect(h.every((w) => w.pitch === null)).toBe(true);
  });

  it("ne trace une semaine qu'avec assez de mesures", () => {
    const h = measuredHistory([...many(5, 2, 10), ...many(2, 9, 10)], 4, TODAY);
    expect(h[3].pitch).not.toBeNull();
    expect(h[2].pitch).toBeNull();
    expect(h[2].samples).toBe(2);
  });

  it("juge chaque semaine sur ses propres mesures", () => {
    const h = measuredHistory([...many(5, 9, 5), ...many(5, 2, 45)], 4, TODAY);
    expect(h[3].pitch as number).toBeLessThan(h[2].pitch as number);
  });
});

describe("capture", () => {
  it("prend la médiane, insensible à une trame aberrante", () => {
    expect(median([1, 2, 3])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    const c = summarizeFrames([60, 60, 60.02, 59.98, 72], [0.9, 0.9, 0.9, 0.9, 0.9], 1, 5)!;
    expect(c.detectedMidi).toBe(60);
    expect(c.clarity).toBeCloseTo(0.9, 5);
  });

  it("renonce sous le nombre de trames requis", () => {
    expect(summarizeFrames([60, 60], [0.9, 0.9], 1, 5)).toBeNull();
  });

  it("mesure une dispersion nulle sur une note parfaitement droite", () => {
    expect(robustSpreadCents([60, 60, 60], 60)).toBe(0);
    expect(robustSpreadCents([60, 60.1, 59.9], 60)).toBeGreaterThan(0);
  });

  it("garde le confort déclaré même sans hauteur exploitable", () => {
    const o = observationFrom(60, null, "range-test", "strained");
    expect(o.detectedMidi).toBeNull();
    expect(o.comfort).toBe("strained");
    expect(o.source).toBe("range-test");
  });
});
