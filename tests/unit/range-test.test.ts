import { describe, expect, it } from "vitest";
import {
  CEIL_MIDI,
  FLOOR_MIDI,
  MAX_STEPS,
  advanceRangeTest,
  beginRangeTest,
  createRangeTest,
  rangeTestProgress,
  shouldAskComfort,
  stopRangeTest,
  type RangeTestState,
  type StepOutcome,
} from "@/lib/assessment/rangeTest";
import type { VocalObservation } from "@/lib/vocal/types";

let counter = 0;
function sung(midi: number, comfort?: VocalObservation["comfort"]): StepOutcome {
  return {
    kind: "sung",
    observation: {
      id: `r${counter++}`,
      targetMidi: midi,
      detectedMidi: midi,
      spreadCents: 10,
      heldSeconds: 2,
      clarity: 0.95,
      comfort,
      source: "range-test",
      at: new Date().toISOString(),
    },
  };
}

/** Simule un chanteur qui réussit tout ce qui tient dans [low, high]. */
function runTest(low: number, high: number, maxSteps = MAX_STEPS + 5): RangeTestState {
  let state = beginRangeTest(createRangeTest({ center: Math.round((low + high) / 2) }));
  let guard = 0;
  while (state.phase !== "done" && guard++ < maxSteps) {
    const t = state.target;
    state = advanceRangeTest(state, t >= low && t <= high ? sung(t) : { kind: "unclear" });
  }
  return state;
}

describe("déroulement du test", () => {
  it("commence par une préparation, pas par un extrême", () => {
    const state = createRangeTest({ center: 60 });
    expect(state.phase).toBe("prepare");
    expect(state.target).toBe(60);
    expect(shouldAskComfort(state)).toBe(false);
  });

  it("établit d'abord la zone centrale, puis descend, puis monte, puis vérifie", () => {
    const seen: string[] = [];
    let state = beginRangeTest(createRangeTest({ center: 60 }));
    let guard = 0;
    while (state.phase !== "done" && guard++ < MAX_STEPS + 5) {
      if (seen[seen.length - 1] !== state.phase) seen.push(state.phase);
      state = advanceRangeTest(state, state.target >= 50 && state.target <= 70 ? sung(state.target) : { kind: "unclear" });
    }
    expect(seen).toEqual(["center", "down", "up", "verify"]);
  });

  it("ne demande le confort que pendant l'exploration", () => {
    let state = beginRangeTest(createRangeTest({ center: 60 }));
    expect(shouldAskComfort(state)).toBe(false); // phase centrale
    while (state.phase === "center") state = advanceRangeTest(state, sung(state.target));
    expect(state.phase).toBe("down");
    expect(shouldAskComfort(state)).toBe(true);
  });

  it("retrouve approximativement l'étendue d'un chanteur simulé", () => {
    const state = runTest(48, 67);
    expect(state.phase).toBe("done");
    // Pas de pas plus fin qu'un demi-ton : on tolère un demi-ton d'écart aux bords.
    expect(state.lowEdge).toBeGreaterThanOrEqual(48);
    expect(state.lowEdge).toBeLessThanOrEqual(49);
    expect(state.highEdge).toBeLessThanOrEqual(67);
    expect(state.highEdge).toBeGreaterThanOrEqual(66);
  });

  it("fonctionne aussi bien pour une basse que pour une soprano", () => {
    const bass = runTest(40, 62);
    expect(bass.lowEdge).toBeLessThanOrEqual(41);
    expect(bass.highEdge).toBeGreaterThanOrEqual(61);

    const soprano = runTest(60, 81);
    expect(soprano.lowEdge).toBeLessThanOrEqual(61);
    expect(soprano.highEdge).toBeGreaterThanOrEqual(80);
  });

  it("collecte une observation par note réussie", () => {
    const state = runTest(55, 67);
    expect(state.observations.length).toBeGreaterThan(8);
    expect(state.observations.every((o) => o.source === "range-test")).toBe(true);
  });
});

describe("règles d'arrêt", () => {
  it("abandonne une direction après deux échecs consécutifs", () => {
    let state = beginRangeTest(createRangeTest({ center: 60 }));
    while (state.phase === "center") state = advanceRangeTest(state, sung(state.target));
    expect(state.phase).toBe("down");
    state = advanceRangeTest(state, { kind: "unclear" });
    expect(state.phase).toBe("down"); // on affine d'un demi-ton
    expect(state.refining).toBe(true);
    state = advanceRangeTest(state, { kind: "unclear" });
    expect(state.phase).toBe("up");
  });

  it("arrête immédiatement la direction sur une gêne déclarée", () => {
    let state = beginRangeTest(createRangeTest({ center: 60 }));
    while (state.phase === "center") state = advanceRangeTest(state, sung(state.target));
    state = advanceRangeTest(state, { kind: "uncomfortable" });
    expect(state.phase).toBe("up");
    expect(state.stoppedEarly).toBe(true);
  });

  it("ne repropose jamais une note après une gêne dans l'aigu", () => {
    let state = beginRangeTest(createRangeTest({ center: 60 }));
    while (state.phase !== "up" && state.phase !== "done") {
      state = advanceRangeTest(state, state.target >= 52 ? sung(state.target) : { kind: "unclear" });
    }
    const stoppedAt = state.target;
    state = advanceRangeTest(state, { kind: "uncomfortable" });
    const targetsAfter: number[] = [];
    let guard = 0;
    while (state.phase !== "done" && guard++ < 20) {
      targetsAfter.push(state.target);
      state = advanceRangeTest(state, sung(state.target));
    }
    expect(targetsAfter.every((t) => t < stoppedAt)).toBe(true);
  });

  it("conserve les observations déjà recueillies après un arrêt volontaire", () => {
    let state = beginRangeTest(createRangeTest({ center: 60 }));
    state = advanceRangeTest(state, sung(state.target));
    const stopped = stopRangeTest(state);
    expect(stopped.phase).toBe("done");
    expect(stopped.observations).toHaveLength(1);
  });

  it("respecte les bornes du détecteur", () => {
    const veryLow = runTest(FLOOR_MIDI - 10, 45);
    expect(veryLow.lowEdge).toBeGreaterThanOrEqual(FLOOR_MIDI);
    const veryHigh = runTest(75, CEIL_MIDI + 10);
    expect(veryHigh.highEdge).toBeLessThanOrEqual(CEIL_MIDI);
  });

  it("se termine toujours, même si tout échoue", () => {
    let state = beginRangeTest(createRangeTest({ center: 60 }));
    let guard = 0;
    while (state.phase !== "done" && guard++ < MAX_STEPS + 10) {
      state = advanceRangeTest(state, { kind: "unclear" });
    }
    expect(state.phase).toBe("done");
  });

  it("se termine aussi quand tout réussit, sans boucler à l'infini", () => {
    let state = beginRangeTest(createRangeTest({ center: 60 }));
    let guard = 0;
    while (state.phase !== "done" && guard++ < MAX_STEPS + 10) {
      state = advanceRangeTest(state, sung(state.target));
    }
    expect(state.phase).toBe("done");
    expect(guard).toBeLessThanOrEqual(MAX_STEPS + 1);
  });
});

describe("progression affichée", () => {
  it("croît sans jamais dépasser 1", () => {
    let state = beginRangeTest(createRangeTest({ center: 60 }));
    let previous = 0;
    let guard = 0;
    while (state.phase !== "done" && guard++ < MAX_STEPS + 5) {
      const p = rangeTestProgress(state);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
      previous = p;
      state = advanceRangeTest(state, state.target >= 50 && state.target <= 70 ? sung(state.target) : { kind: "unclear" });
    }
    expect(rangeTestProgress(state)).toBe(1);
    expect(previous).toBeLessThanOrEqual(1);
  });
});
