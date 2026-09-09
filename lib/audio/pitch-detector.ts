"use client";

/**
 * Détection de hauteur approximative via autocorrélation normalisée.
 *
 * LIMITES (affichées à l'utilisateur) :
 * - fonctionne pour une voix seule, tenue, dans une pièce calme ;
 * - imprécise sur les attaques, consonnes, bruits de fond ;
 * - peut se tromper d'une octave ;
 * - résolution ≈ quelques cents au mieux, dépend du micro et du navigateur.
 * Ce n'est pas un instrument de mesure, c'est un repère pédagogique.
 */

export interface PitchFrame {
  /** Fréquence estimée en Hz, ou null si aucun son clair. */
  frequency: number | null;
  /** Clarté 0–1 de l'estimation. */
  clarity: number;
  /** Niveau RMS 0–1. */
  level: number;
  time: number;
}

export type PitchListener = (frame: PitchFrame) => void;

export class PitchDetector {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private buffer: Float32Array<ArrayBuffer> | null = null;
  private raf = 0;
  private listeners = new Set<PitchListener>();
  private lastFreq: number | null = null;
  running = false;

  async start(): Promise<void> {
    if (this.running) return;
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Micro non disponible dans ce navigateur.");
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor();
    if (this.ctx.state === "suspended") await this.ctx.resume();
    const source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    source.connect(this.analyser);
    this.buffer = new Float32Array(this.analyser.fftSize);
    this.running = true;
    const tick = () => {
      if (!this.running) return;
      this.analyse();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    void this.ctx?.close();
    this.ctx = null;
    this.analyser = null;
    this.lastFreq = null;
  }

  subscribe(fn: PitchListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private analyse() {
    if (!this.analyser || !this.buffer || !this.ctx) return;
    this.analyser.getFloatTimeDomainData(this.buffer);
    const buf = this.buffer;
    const n = buf.length;
    let rms = 0;
    for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / n);

    const frame: PitchFrame = { frequency: null, clarity: 0, level: Math.min(1, rms * 8), time: performance.now() };

    if (rms < 0.012) {
      this.lastFreq = null;
      this.emit(frame);
      return;
    }

    const sampleRate = this.ctx.sampleRate;
    const minLag = Math.floor(sampleRate / 1000); // 1000 Hz max
    const maxLag = Math.floor(sampleRate / 60); // 60 Hz min

    // Autocorrélation normalisée (proche de la NSDF de McLeod)
    let bestLag = -1;
    let bestCorr = 0;
    let foundPositive = false;
    let prevCorr = 0;
    const half = Math.floor(n / 2);
    const nsdf = new Float32Array(maxLag + 1);
    for (let lag = minLag; lag <= maxLag; lag++) {
      let acf = 0;
      let m = 0;
      for (let i = 0; i < half; i++) {
        const a = buf[i];
        const b = buf[i + lag];
        acf += a * b;
        m += a * a + b * b;
      }
      const corr = m > 0 ? (2 * acf) / m : 0;
      nsdf[lag] = corr;
      if (!foundPositive) {
        if (corr < 0) foundPositive = true; // on attend d'être passé par un creux
      } else {
        if (corr > bestCorr) {
          bestCorr = corr;
          bestLag = lag;
        } else if (bestLag > 0 && corr < prevCorr && bestCorr > 0.85) {
          // premier pic net trouvé : on arrête pour éviter de choisir le sous-harmonique
          break;
        }
      }
      prevCorr = corr;
    }

    if (bestLag < 0 || bestCorr < 0.8) {
      this.emit(frame);
      return;
    }

    // Interpolation parabolique autour du pic
    let lag = bestLag;
    if (bestLag > minLag && bestLag < maxLag) {
      const y0 = nsdf[bestLag - 1];
      const y1 = nsdf[bestLag];
      const y2 = nsdf[bestLag + 1];
      const denom = y0 - 2 * y1 + y2;
      if (denom !== 0) lag = bestLag + (0.5 * (y0 - y2)) / denom;
    }
    let freq = sampleRate / lag;

    // Lissage doux pour éviter le scintillement
    if (this.lastFreq && Math.abs(freq - this.lastFreq) / this.lastFreq < 0.06) {
      freq = this.lastFreq * 0.6 + freq * 0.4;
    }
    this.lastFreq = freq;

    frame.frequency = freq;
    frame.clarity = bestCorr;
    this.emit(frame);
  }

  private emit(frame: PitchFrame) {
    this.listeners.forEach((l) => l(frame));
  }
}

let shared: PitchDetector | null = null;
export function getPitchDetector(): PitchDetector {
  if (!shared) shared = new PitchDetector();
  return shared;
}

export function isMicSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}
