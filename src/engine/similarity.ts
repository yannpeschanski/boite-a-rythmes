// Indicateur « le plus proche de ce que tu joues » — compare en continu le
// pattern courant aux 34 presets, Y COMPRIS en testant les 6 permutations de
// lignes (un rythme joué kick/snare/hat inversé reste le même rythme).
// Port de similarityScore/updateClosestMatch (l. 6584–6642).
import type { PatternStateV2, DrumRowName, DrumStep } from '../model/types';
import { DRUM_ROW_NAMES } from '../model/types';
import { PRESETS, type SongPresetData } from '../model/presets/songs';

// Les 6 permutations des 3 lignes.
const PERMUTATIONS: DrumRowName[][] = [
  ['kick', 'snare', 'hat'],
  ['kick', 'hat', 'snare'],
  ['snare', 'kick', 'hat'],
  ['snare', 'hat', 'kick'],
  ['hat', 'kick', 'snare'],
  ['hat', 'snare', 'kick'],
];

function normalizePattern(pattern: Array<boolean | number>, subdiv: number): DrumStep[] {
  return new Array(subdiv).fill(0).map((_, i) => {
    const v = pattern[i];
    return (v === true ? 1 : v === 2 ? 2 : v ? 1 : 0) as DrumStep;
  });
}

// Score de similarité entre deux lignes, rééchantillonnées sur une grille
// commune : deux rythmes de subdivisions différentes restent comparables.
function rowScore(a: DrumStep[], aSub: number, b: DrumStep[], bSub: number): number {
  const grid = Math.max(aSub, bSub);
  let hits = 0;
  for (let i = 0; i < grid; i++) {
    const av = a[Math.floor((i * aSub) / grid)] > 0;
    const bv = b[Math.floor((i * bSub) / grid)] > 0;
    if (av === bv) hits++;
  }
  return hits / grid;
}

export interface ClosestMatch {
  preset: SongPresetData;
  score: number;
}

export function findClosestPreset(state: PatternStateV2): ClosestMatch | null {
  let best: ClosestMatch | null = null;
  for (const preset of PRESETS) {
    const presetRows = DRUM_ROW_NAMES.map((n) => {
      const src = preset[n];
      return { pattern: normalizePattern(src.pattern, src.subdiv), subdiv: src.subdiv };
    });
    for (const perm of PERMUTATIONS) {
      let total = 0;
      perm.forEach((rowName, i) => {
        const mine = state.rows[rowName];
        total += rowScore(mine.pattern, mine.subdiv, presetRows[i].pattern, presetRows[i].subdiv);
      });
      const score = total / 3;
      if (!best || score > best.score) best = { preset, score };
    }
  }
  return best;
}
