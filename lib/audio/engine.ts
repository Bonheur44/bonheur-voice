"use client";

import { midiToFreq } from "./notes";
import {
  DEFAULT_INSTRUMENT,
  DEFAULT_VOICE_SET,
  resolveTimbre,
  type InstrumentId,
  type Role,
  type VoiceSetId,
} from "./timbres";

/** Rôle sonore demandé par l'appelant. Le timbre effectif dépend des préférences. */
export type Timbre = Role;

export interface PlayingNote {
  stop: (when?: number) => void;
  gain: GainNode;
  setFrequency: (freq: number, when?: number, glide?: number) => void;
}

/**
 * Moteur audio minimal basé sur la Web Audio API.
 * Singleton côté client ; l'AudioContext est créé/repris au premier geste utilisateur.
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private volume = 0.8;
  private instrument: InstrumentId = DEFAULT_INSTRUMENT;
  private voiceSet: VoiceSetId = DEFAULT_VOICE_SET;

  get context(): AudioContext | null {
    return this.ctx;
  }

  /** Timbre de l'instrument de référence : piano, bourdon, gammes, mélodies. */
  setInstrument(id: InstrumentId) {
    this.instrument = id;
  }

  /** Timbre des quatre pupitres du mode chorale. */
  setVoiceSet(id: VoiceSetId) {
    this.voiceSet = id;
  }

  get instrumentId(): InstrumentId {
    return this.instrument;
  }

  get voiceSetId(): VoiceSetId {
    return this.voiceSet;
  }

  ensure(): AudioContext {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  get now(): number {
    return this.ensure().currentTime;
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.setTargetAtTime(this.volume, this.ensure().currentTime, 0.02);
  }

  /** Crée un bus de gain relié à la sortie principale (mixage par voix). */
  createBus(level = 1): GainNode {
    const ctx = this.ensure();
    const g = ctx.createGain();
    g.gain.value = level;
    g.connect(this.master!);
    return g;
  }

  /** Démarre une note ; retourne un handle pour l'arrêter ou changer sa hauteur. */
  start(midi: number, timbre: Timbre = "piano", when?: number, level = 1): PlayingNote {
    const ctx = this.ensure();
    const cfg = resolveTimbre(timbre, this.instrument, this.voiceSet);
    const t0 = when ?? ctx.currentTime;
    const freq = midiToFreq(midi);

    const peak = Math.max(0.0002, cfg.gain * level);
    const decay = cfg.decay ?? 0;
    const sustain = Math.max(0.0001, peak * (cfg.sustain ?? 1));
    const decayEnd = t0 + cfg.attack + decay;

    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t0);
    out.gain.linearRampToValueAtTime(peak, t0 + cfg.attack);
    // Chute vers le niveau de tenue : c'est ce qui distingue un piano d'un orgue.
    if (decay > 0 && sustain < peak) out.gain.exponentialRampToValueAtTime(sustain, decayEnd);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cfg.cutoff;
    filter.Q.value = 0.7;
    filter.connect(out);
    out.connect(this.master!);

    const oscs: OscillatorNode[] = [];
    const osc1 = ctx.createOscillator();
    osc1.type = cfg.osc;
    osc1.frequency.setValueAtTime(freq, t0);
    osc1.connect(filter);
    oscs.push(osc1);

    if (cfg.osc2) {
      const osc2 = ctx.createOscillator();
      osc2.type = cfg.osc2;
      osc2.frequency.setValueAtTime(freq, t0);
      if (cfg.detune2) osc2.detune.setValueAtTime(cfg.detune2, t0);
      const g2 = ctx.createGain();
      g2.gain.value = cfg.osc2Gain ?? 0.5;
      osc2.connect(g2);
      g2.connect(filter);
      oscs.push(osc2);
    }

    let lfo: OscillatorNode | null = null;
    if (cfg.vibratoRate && cfg.vibratoDepth) {
      lfo = ctx.createOscillator();
      lfo.frequency.value = cfg.vibratoRate;
      const lfoGain = ctx.createGain();
      lfo.connect(lfoGain);
      oscs.forEach((o) => lfoGain.connect(o.detune));
      // Vibrato retardé : une note commence droite, puis ondule.
      lfoGain.gain.setValueAtTime(0, t0);
      lfoGain.gain.linearRampToValueAtTime(cfg.vibratoDepth, t0 + (cfg.vibratoDelay ?? 0.6));
      lfo.start(t0);
    }

    oscs.forEach((o) => o.start(t0));

    const stop = (whenStop?: number) => {
      const ts = Math.max(whenStop ?? ctx.currentTime, t0 + cfg.attack + 0.001);
      // On reconstitue le niveau attendu à cet instant plutôt que de lire la valeur
      // courante : pour une note planifiée à l'avance, celle-ci vaut encore zéro.
      const levelAtStop = decay > 0 && ts >= decayEnd ? sustain : peak;
      out.gain.cancelScheduledValues(ts);
      out.gain.setValueAtTime(levelAtStop, ts);
      out.gain.exponentialRampToValueAtTime(0.0001, ts + cfg.release);
      oscs.forEach((o) => o.stop(ts + cfg.release + 0.05));
      lfo?.stop(ts + cfg.release + 0.05);
    };

    const setFrequency = (f: number, whenSet?: number, glide = 0) => {
      const ts = whenSet ?? ctx.currentTime;
      oscs.forEach((o) => {
        if (glide > 0) {
          o.frequency.setValueAtTime(o.frequency.value, ts);
          o.frequency.exponentialRampToValueAtTime(f, ts + glide);
        } else {
          o.frequency.setValueAtTime(f, ts);
        }
      });
    };

    return { stop, gain: out, setFrequency };
  }

  /** Joue une note d'une durée fixe. */
  play(midi: number, duration: number, timbre: Timbre = "piano", when?: number, level = 1): PlayingNote {
    const t0 = when ?? this.ensure().currentTime;
    const n = this.start(midi, timbre, t0, level);
    n.stop(t0 + duration);
    return n;
  }

  /** Glissando continu d'une note à une autre. */
  glide(fromMidi: number, toMidi: number, duration: number, timbre: Timbre = "drone", when?: number): PlayingNote {
    const t0 = when ?? this.ensure().currentTime;
    const n = this.start(fromMidi, timbre, t0, 0.8);
    n.setFrequency(midiToFreq(toMidi), t0 + 0.05, Math.max(0.05, duration - 0.1));
    n.stop(t0 + duration);
    return n;
  }

  click(accent = false, when?: number) {
    const ctx = this.ensure();
    const t0 = when ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = accent ? 1600 : 1000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(accent ? 0.5 : 0.3, t0 + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
    osc.connect(g);
    g.connect(this.master!);
    osc.start(t0);
    osc.stop(t0 + 0.08);
  }
}

let engine: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!engine) engine = new AudioEngine();
  return engine;
}

/**
 * Séquenceur simple : joue une liste d'événements avec un timbre, en planifiant tout à l'avance.
 * Retourne une fonction d'arrêt.
 */
export function playTimeline(
  events: Array<{ midi: number | null; start: number; duration: number }>,
  timbre: Timbre = "piano",
  level = 1,
  onNote?: (index: number) => void,
): { stop: () => void; totalDuration: number } {
  const eng = getAudioEngine();
  const t0 = eng.now + 0.05;
  const handles: PlayingNote[] = [];
  const timers: number[] = [];
  let total = 0;
  events.forEach((ev, i) => {
    total = Math.max(total, ev.start + ev.duration);
    if (onNote) timers.push(window.setTimeout(() => onNote(i), ev.start * 1000));
    if (ev.midi === null) return;
    handles.push(eng.play(ev.midi, Math.max(0.05, ev.duration - 0.04), timbre, t0 + ev.start, level));
  });
  return {
    stop: () => {
      handles.forEach((h) => h.stop());
      timers.forEach((t) => clearTimeout(t));
    },
    totalDuration: total,
  };
}
