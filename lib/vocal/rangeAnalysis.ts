import type { Band, NoteEvidence, TransitionZone } from "./types";

/** Écart maximal toléré entre deux notes voisines d'une même grappe. */
export const MAX_GAP = 3;

/**
 * Construit une bande à partir de notes éparses.
 *
 * On ne prend pas simplement le minimum et le maximum : une note isolée à sept
 * demi-tons du reste — typiquement une erreur d'octave du détecteur — doublerait
 * l'étendue affichée. On découpe donc en grappes contiguës et on garde la plus
 * fournie ; à égalité, la plus large.
 */
export function toBand(midis: number[], maxGap = MAX_GAP): Band | null {
  const sorted = [...new Set(midis)].sort((a, b) => a - b);
  if (sorted.length === 0) return null;

  let best: { low: number; high: number; count: number } | null = null;
  let start = sorted[0];
  let count = 1;

  const consider = (low: number, high: number, n: number) => {
    if (!best || n > best.count || (n === best.count && high - low > best.high - best.low)) {
      best = { low, high, count: n };
    }
  };

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] <= maxGap) {
      count++;
    } else {
      consider(start, sorted[i - 1], count);
      start = sorted[i];
      count = 1;
    }
  }
  consider(start, sorted[sorted.length - 1], count);

  const found = best as { low: number; high: number; count: number } | null;
  return found ? { low: found.low, high: found.high } : null;
}

export function bandWidth(band: Band | null): number {
  return band ? band.high - band.low : 0;
}

export function bandContains(band: Band | null, midi: number): boolean {
  return !!band && midi >= band.low && midi <= band.high;
}

/** Nombre de demi-tons communs à deux bandes. */
export function overlapSize(a: Band, b: Band): number {
  return Math.max(0, Math.min(a.high, b.high) - Math.max(a.low, b.low) + 1);
}

/** Recouvrement de Jaccard : 1 si les bandes coïncident, 0 si elles sont disjointes. */
export function jaccard(a: Band, b: Band): number {
  const inter = overlapSize(a, b);
  const union = a.high - a.low + 1 + (b.high - b.low + 1) - inter;
  return union > 0 ? inter / union : 0;
}

// ------------------------------------------------------------------ critères

/** Note réellement produite au moins une fois, et non déclarée impossible. */
export function isExplored(n: NoteEvidence): boolean {
  return n.produced >= 1 && (n.comfort === null || n.comfort > -0.9);
}

/**
 * Note reproductible : deux tentatives correctes, ou une seule franchement bonne.
 * Exiger systématiquement deux essais rendrait un premier test incapable de
 * produire la moindre bande fiable.
 */
export function isReliable(n: NoteEvidence): boolean {
  if (!isExplored(n)) return false;
  if (n.accuracy < 0.6 || n.stability < 0.4) return false;
  return n.produced >= 2 || (n.accuracy >= 0.8 && n.stability >= 0.6);
}

/** Note fiable, sans tension déclarée, et de qualité honnête. */
export function isComfortable(n: NoteEvidence): boolean {
  return isReliable(n) && (n.comfort ?? 0) >= 0 && n.quality >= 0.55;
}

// ------------------------------------------------------------------- analyse

export interface RangeBands {
  explored: Band | null;
  reliable: Band | null;
  comfortable: Band | null;
  central: Band | null;
  transitions: TransitionZone[];
}

/**
 * Noyau de la zone confortable : les notes dont la qualité approche le sommet observé.
 * C'est la zone où la voix « fonctionne toute seule ».
 */
function centralOf(notes: NoteEvidence[], comfortable: Band | null): Band | null {
  if (!comfortable) return null;
  const inside = notes.filter((n) => isComfortable(n) && bandContains(comfortable, n.midi));
  if (inside.length === 0) return null;

  const qualities = inside.map((n) => n.quality);
  const peak = Math.max(...qualities);
  const floor = Math.min(...qualities);

  // Seuil relatif à la dispersion observée, et non à la valeur absolue : dans la
  // zone confortable, la justesse est bonne partout et écrase les écarts. Si la
  // qualité y est uniforme, il n'y a pas de noyau plus étroit à distinguer — et
  // le dire est plus honnête que d'en découper un arbitrairement.
  if (peak - floor < 0.05) return { ...comfortable };
  const threshold = peak - 0.35 * (peak - floor);

  const core = inside.filter((n) => n.quality >= threshold).map((n) => n.midi);
  const band = toBand(core, 2);
  if (!band) return null;
  return { low: Math.max(band.low, comfortable.low), high: Math.min(band.high, comfortable.high) };
}

/**
 * Zones de transition : creux de qualité encadrés par deux zones meilleures.
 *
 * C'est un indice, pas un diagnostic de passaggio. On ne le publie que si la
 * bande fiable est assez large et assez documentée pour qu'un creux local ait
 * un sens ; sinon un simple essai raté suffirait à inventer une transition.
 */
function transitionsOf(notes: NoteEvidence[], reliable: Band | null): TransitionZone[] {
  if (!reliable || bandWidth(reliable) < 9) return [];
  const inside = notes.filter((n) => bandContains(reliable, n.midi) && n.produced >= 1).sort((a, b) => a.midi - b.midi);
  if (inside.length < 6) return [];

  /** Meilleure qualité observée dans une fenêtre voisine. */
  const bestIn = (low: number, high: number): number | null => {
    const window = inside.filter((n) => n.midi >= low && n.midi <= high);
    return window.length > 0 ? Math.max(...window.map((n) => n.quality)) : null;
  };

  const zones: TransitionZone[] = [];
  for (const cur of inside) {
    // Fenêtre de quatre demi-tons de chaque côté : une transition s'étale
    // souvent sur deux ou trois notes, et comparer aux seuls voisins immédiats
    // ferait disparaître un creux large — chaque note du creux annulant l'autre.
    const below = bestIn(cur.midi - 4, cur.midi - 1);
    const above = bestIn(cur.midi + 1, cur.midi + 4);
    if (below === null || above === null) continue;
    const contrast = Math.min(below, above) - cur.quality;
    if (contrast < 0.12) continue;
    const last = zones[zones.length - 1];
    if (last && cur.midi - last.high <= 1) {
      last.high = cur.midi;
      last.strength = Math.max(last.strength, Math.min(1, contrast));
    } else {
      zones.push({ low: cur.midi, high: cur.midi, strength: Math.min(1, contrast) });
    }
  }
  return zones;
}

export function analyseRange(notes: NoteEvidence[]): RangeBands {
  const explored = toBand(notes.filter(isExplored).map((n) => n.midi));
  const reliable = toBand(notes.filter(isReliable).map((n) => n.midi));
  const comfortable = toBand(notes.filter(isComfortable).map((n) => n.midi), 2);
  return {
    explored,
    reliable,
    comfortable,
    central: centralOf(notes, comfortable),
    transitions: transitionsOf(notes, reliable),
  };
}
