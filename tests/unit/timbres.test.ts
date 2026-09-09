import { describe, expect, it } from "vitest";
import {
  DEFAULT_INSTRUMENT,
  DEFAULT_VOICE_SET,
  INSTRUMENTS,
  INSTRUMENT_IDS,
  VOICE_PARTS,
  VOICE_SETS,
  VOICE_SET_IDS,
  droneFrom,
  isInstrumentId,
  isVoiceSetId,
  resolveTimbre,
  type InstrumentId,
  type VoiceSetId,
} from "@/lib/audio/timbres";

describe("banque d'instruments", () => {
  it.each(INSTRUMENT_IDS)("le préréglage %s est cohérent", (id) => {
    const preset = INSTRUMENTS[id];
    expect(preset.id).toBe(id);
    expect(preset.label.length).toBeGreaterThan(0);
    expect(preset.description.length).toBeGreaterThan(0);
    const { config } = preset;
    // Un gain trop élevé sature une fois les quatre voix superposées.
    expect(config.gain).toBeGreaterThan(0);
    expect(config.gain).toBeLessThanOrEqual(0.6);
    expect(config.cutoff).toBeGreaterThan(200);
    expect(config.attack).toBeGreaterThan(0);
    expect(config.release).toBeGreaterThan(0);
    if (config.sustain !== undefined) {
      expect(config.sustain).toBeGreaterThan(0);
      expect(config.sustain).toBeLessThanOrEqual(1);
    }
  });

  it("propose plusieurs choix, dont le défaut", () => {
    expect(INSTRUMENT_IDS.length).toBeGreaterThanOrEqual(4);
    expect(INSTRUMENT_IDS).toContain(DEFAULT_INSTRUMENT);
  });

  it("le son pur n'a qu'un oscillateur, ce qui est le but", () => {
    expect(INSTRUMENTS.sine.config.osc2).toBeUndefined();
    expect(INSTRUMENTS.sine.config.osc).toBe("sine");
  });

  it("l'orgue tient sa note, le piano s'éteint", () => {
    expect(INSTRUMENTS.organ.config.sustain).toBe(1);
    expect(INSTRUMENTS.piano.config.sustain ?? 1).toBeLessThan(1);
    expect(INSTRUMENTS.piano.config.decay ?? 0).toBeGreaterThan(0);
  });
});

describe("banque de voix", () => {
  it.each(VOICE_SET_IDS)("le jeu %s définit les quatre pupitres", (id) => {
    const set = VOICE_SETS[id];
    expect(set.id).toBe(id);
    expect(set.label.length).toBeGreaterThan(0);
    for (const part of VOICE_PARTS) {
      const config = set.parts[part];
      expect(config, `${id}/${part}`).toBeDefined();
      expect(config.gain).toBeGreaterThan(0);
      expect(config.gain).toBeLessThanOrEqual(0.4);
      expect(config.cutoff).toBeGreaterThan(200);
    }
  });

  it("propose plusieurs choix, dont le défaut", () => {
    expect(VOICE_SET_IDS.length).toBeGreaterThanOrEqual(4);
    expect(VOICE_SET_IDS).toContain(DEFAULT_VOICE_SET);
  });

  it("les voix droites n'ont aucun vibrato", () => {
    for (const part of VOICE_PARTS) {
      expect(VOICE_SETS.droite.parts[part].vibratoDepth ?? 0).toBe(0);
    }
  });

  it("les voix identiques sont réellement indiscernables", () => {
    const reference = JSON.stringify(VOICE_SETS.identiques.parts.T);
    for (const part of VOICE_PARTS) {
      expect(JSON.stringify(VOICE_SETS.identiques.parts[part])).toBe(reference);
    }
  });

  it("les jeux différenciés donnent une basse plus sombre que la soprano", () => {
    for (const id of VOICE_SET_IDS.filter((v) => v !== "identiques")) {
      expect(VOICE_SETS[id].parts.B.cutoff, id).toBeLessThan(VOICE_SETS[id].parts.S.cutoff);
    }
  });
});

describe("resolveTimbre", () => {
  it("associe le rôle piano à l'instrument choisi", () => {
    expect(resolveTimbre("piano", "organ", "voix")).toEqual(INSTRUMENTS.organ.config);
    expect(resolveTimbre("piano", "sine", "voix")).toEqual(INSTRUMENTS.sine.config);
  });

  it("associe chaque pupitre au jeu de voix choisi", () => {
    for (const part of VOICE_PARTS) {
      expect(resolveTimbre(part, "piano", "orgue")).toEqual(VOICE_SETS.orgue.parts[part]);
    }
  });

  it("laisse le clic du métronome indépendant des préférences", () => {
    const a = resolveTimbre("click", "piano", "voix");
    const b = resolveTimbre("click", "sine", "orgue");
    expect(a).toEqual(b);
  });

  it("rend le bourdon tenu et sans vibrato quel que soit l'instrument", () => {
    for (const id of INSTRUMENT_IDS) {
      const drone = resolveTimbre("drone", id, "voix");
      expect(drone.sustain, id).toBe(1);
      expect(drone.decay ?? 0, id).toBe(0);
      expect(drone.vibratoDepth, id).toBeUndefined();
      expect(drone.attack, id).toBeGreaterThanOrEqual(0.25);
    }
  });

  it("revient aux valeurs par défaut si le réglage enregistré est inconnu", () => {
    expect(resolveTimbre("piano", "inexistant" as InstrumentId, "voix")).toEqual(INSTRUMENTS[DEFAULT_INSTRUMENT].config);
    expect(resolveTimbre("T", "piano", "inexistant" as VoiceSetId)).toEqual(VOICE_SETS[DEFAULT_VOICE_SET].parts.T);
  });
});

describe("validation des identifiants enregistrés", () => {
  it("reconnaît les identifiants valides", () => {
    expect(isInstrumentId("rhodes")).toBe(true);
    expect(isVoiceSetId("cordes")).toBe(true);
  });

  it("rejette tout le reste", () => {
    for (const value of ["", "autre", null, undefined, 3, {}]) {
      expect(isInstrumentId(value)).toBe(false);
      expect(isVoiceSetId(value)).toBe(false);
    }
  });
});

describe("droneFrom", () => {
  it("allonge l'attaque et la chute sans toucher au timbre", () => {
    const drone = droneFrom(INSTRUMENTS.piano.config);
    expect(drone.osc).toBe(INSTRUMENTS.piano.config.osc);
    expect(drone.gain).toBeLessThan(INSTRUMENTS.piano.config.gain);
    expect(drone.sustain).toBe(1);
  });
});
