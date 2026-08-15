// Indicateur « le plus proche de ce que tu joues » — compare en continu le
// pattern courant aux 34 presets, Y COMPRIS en testant les 6 permutations de
// lignes (un rythme joué kick/snare/hat inversé reste le même rythme).
// Port de similarityScore/updateClosestMatch (l. 6584–6642).
import type { PatternStateV2, DrumRowName, DrumStep } from '../model/types';
import { PRESETS, type SongPresetData } from '../model/presets/songs';

// Comparaison volontairement limitée à kick/snare/hat (PLAN.md §6) : clap et
// shaker n'existent pas dans les 34 presets (contenu non écrit dans cette
// passe) et 5 lignes feraient exploser les permutations testées (5! = 120
// contre 6 aujourd'hui) — PAS `DRUM_ROW_NAMES` (qui inclut désormais
// clap/shaker) pour ce tableau ni pour la comparaison ci-dessous.
const SIMILARITY_ROWS = ['kick', 'snare', 'hat'] as const;

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

// Classement complet plutôt que le seul gagnant : l'analyseur de l'onglet
// Production affiche les suivants, ce qui rend le verdict honnête — 62 %
// contre 58 %, ce n'est pas la même chose que 88 % contre 41 %, et
// n'afficher que le premier laisserait croire à une certitude qu'on n'a pas.
// Un seul parcours des 34 presets × 6 permutations pour les deux usages :
// on garde le meilleur score PAR preset (sinon un même morceau apparaîtrait
// plusieurs fois dans le classement, une fois par permutation).
export function rankPresets(state: PatternStateV2): ClosestMatch[] {
  const out: ClosestMatch[] = [];
  for (const preset of PRESETS) {
    const presetRows = SIMILARITY_ROWS.map((n) => {
      const src = preset[n];
      return { pattern: normalizePattern(src.pattern, src.subdiv), subdiv: src.subdiv };
    });
    let bestForPreset = -1;
    for (const perm of PERMUTATIONS) {
      let total = 0;
      perm.forEach((rowName, i) => {
        const mine = state.rows[rowName];
        total += rowScore(mine.pattern, mine.subdiv, presetRows[i].pattern, presetRows[i].subdiv);
      });
      const score = total / 3;
      if (score > bestForPreset) bestForPreset = score;
    }
    out.push({ preset, score: bestForPreset });
  }
  return out.sort((a, b) => b.score - a.score);
}

export function findClosestPreset(state: PatternStateV2): ClosestMatch | null {
  return rankPresets(state)[0] ?? null;
}
