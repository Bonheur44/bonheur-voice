"use client";

import { getAudioEngine } from "./engine";

/** Métronome avec planification anticipée (lookahead) pour une pulsation stable. */
export class Metronome {
  private timer = 0;
  private nextBeatTime = 0;
  private beat = 0;
  bpm: number;
  beatsPerBar: number;
  onBeat?: (beat: number, accent: boolean) => void;
  running = false;

  constructor(bpm = 80, beatsPerBar = 4) {
    this.bpm = bpm;
    this.beatsPerBar = beatsPerBar;
  }

  start() {
    if (this.running) return;
    const eng = getAudioEngine();
    this.running = true;
    this.beat = 0;
    this.nextBeatTime = eng.now + 0.1;
    this.schedule();
  }

  stop() {
    this.running = false;
    window.clearTimeout(this.timer);
  }

  private schedule() {
    if (!this.running) return;
    const eng = getAudioEngine();
    const lookahead = 0.12;
    while (this.nextBeatTime < eng.now + lookahead) {
      const accent = this.beat % this.beatsPerBar === 0;
      eng.click(accent, this.nextBeatTime);
      const b = this.beat;
      const delay = Math.max(0, (this.nextBeatTime - eng.now) * 1000);
      window.setTimeout(() => this.onBeat?.(b % this.beatsPerBar, accent), delay);
      this.nextBeatTime += 60 / this.bpm;
      this.beat++;
    }
    this.timer = window.setTimeout(() => this.schedule(), 40);
  }
}
