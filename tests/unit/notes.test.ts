import { describe, expect, it } from "vitest";
import { centsOff, freqToMidi, midiToFreq, midiToName } from "@/lib/audio/notes";
import { fitShift, melodyToTimeline } from "@/lib/audio/transpose";
import { CHORALE_1 } from "@/data/music/chorale";
import { MELODIES } from "@/data/music/melodies";

describe("notes", () => {
  it("La4 = 440 Hz", () => {
    expect(midiToFreq(69)).toBeCloseTo(440);
    expect(freqToMidi(440)).toBeCloseTo(69);
  });
  it("nomme les notes en français", () => {
    expect(midiToName(60)).toBe("Do4");
    expect(midiToName(48)).toBe("Do3");
    expect(midiToName(67)).toBe("Sol4");
    expect(midiToName(61)).toBe("Do#4");
  });
  it("calcule l'écart en cents", () => {
    expect(centsOff(440, 69)).toBeCloseTo(0);
    expect(centsOff(466.16, 69)).toBeCloseTo(100, 0);
  });
});

describe("transposition", () => {
  it("ne décale pas une mélodie qui tient dans la zone", () => {
    expect(fitShift([55, 57, 60], 48, 67)).toBe(0);
  });
  it("décale une mélodie trop haute vers la zone", () => {
    const shift = fitShift([70, 72, 74], 48, 67);
    expect(74 + shift).toBeLessThanOrEqual(67);
  });
  it("convertit une mélodie en timeline", () => {
    const tl = melodyToTimeline([{ midi: 60, beats: 1 }, { midi: null, beats: 1 }, { midi: 62, beats: 2 }], 60, 2);
    expect(tl[0]).toMatchObject({ midi: 62, start: 0, duration: 1 });
    expect(tl[1].midi).toBeNull();
    expect(tl[2]).toMatchObject({ midi: 64, start: 2, duration: 2 });
  });
});

describe("données musicales", () => {
  it("le choral a 4 voix de même durée", () => {
    const durations = Object.values(CHORALE_1.parts).map((p) => p.reduce((a, n) => a + n.beats, 0));
    expect(new Set(durations).size).toBe(1);
    expect(durations[0]).toBe(CHORALE_1.bars * CHORALE_1.beatsPerBar);
  });
  it("les voix ne se croisent pas", () => {
    const tl = (v: "S" | "A" | "T" | "B") => melodyToTimeline(CHORALE_1.parts[v], 60);
    const at = (part: ReturnType<typeof tl>, t: number) => part.find((n) => t >= n.start && t < n.start + n.duration)!.midi!;
    const S = tl("S"), A = tl("A"), T = tl("T"), B = tl("B");
    for (let t = 0; t < 32; t += 0.5) {
      expect(at(S, t)).toBeGreaterThanOrEqual(at(A, t));
      expect(at(A, t)).toBeGreaterThanOrEqual(at(T, t));
      expect(at(T, t)).toBeGreaterThanOrEqual(at(B, t));
    }
  });
  it("la ligne de ténor de référence reste dans une zone ténor raisonnable", () => {
    const midis = CHORALE_1.parts.T.map((n) => n.midi!).filter(Boolean);
    expect(Math.min(...midis)).toBeGreaterThanOrEqual(48);
    expect(Math.max(...midis)).toBeLessThanOrEqual(67);
  });
  it("chaque mélodie a des identifiants uniques et des phrases non vides", () => {
    const ids = MELODIES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of MELODIES) for (const p of m.phrases) expect(p.notes.length).toBeGreaterThan(0);
  });
});
