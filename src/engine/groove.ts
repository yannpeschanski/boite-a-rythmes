// Helpers de groove — fonctions pures, mêmes formules que l'original.
import type { PatternStateV2, DrumRowName } from '../model/types';

// Une mesure = 4 temps : barDuration = 240/BPM secondes.
export function barDuration(tempo: number): number {
  return 240 / tempo;
}

/* Une ligne sonne-t-elle ? Définition UNIQUE, partagée par l'ordonnanceur et
 * par le séquenceur du Mode Live qui la dessine.
 *
 * ⚠️ L'override du Live est TERNAIRE : `undefined` = suivre le motif, `true` =
 * couper, `false` = forcer ouvert. Le troisième état existe parce que le
 * séquenceur du Live affiche l'état RÉEL d'une ligne : il doit donc pouvoir
 * rouvrir une ligne coupée dans l'Atelier, sans jamais écrire dans le motif.
 * Deux définitions de « coupée » finiraient par ne plus être d'accord, et
 * c'est l'affichage qui mentirait — le seul reproche qu'on ne puisse pas faire
 * à un séquenceur.
 */
export function coupee(muteDuMotif: boolean, overrideLive: boolean | undefined): boolean {
  return overrideLive ?? muteDuMotif;
}

export function stepDurationFor(state: PatternStateV2, rowName: DrumRowName): number {
  return barDuration(state.tempo) / state.rows[rowName].subdiv;
}

// Fill toutes les N mesures : la dernière mesure du cycle est la mesure de fill.
export function isFillBar(state: PatternStateV2, currentBar: number): boolean {
  const n = state.fillEvery;
  return n > 0 && currentBar % n === n - 1;
}

// Le "dernier quart" d'une ligne (zone de fill) : au moins 1 pas.
export function isLastSteps(col: number, subdiv: number): boolean {
  const count = Math.max(1, Math.round(subdiv * 0.25));
  return col >= subdiv - count;
}

// Bouton 🫨 Break — la mesure se dépouille (seul le hat tient le temps) puis
// explose sur le dernier quart. Décidé à partir de l'instant audio absolu `t`
// d'une note déjà programmée, plutôt que d'un numéro de pas : marche
// identiquement pour toutes les lignes malgré leurs subdivisions différentes.
export const BREAK_STRIP_RATIO = 0.75; // 75% dépouillé, 25% explosion

export interface BreakWindow {
  startTime: number;
  endTime: number;
}

export function breakPhaseFor(
  t: number,
  brk: BreakWindow | null,
  barDur: number,
): 'strip' | 'explode' | null {
  if (!brk) return null;
  if (t < brk.startTime || t >= brk.endTime) return null;
  const phase = (t - brk.startTime) / barDur;
  return phase < BREAK_STRIP_RATIO ? 'strip' : 'explode';
}

// Vélocité aléatoire : chaque frappe varie un peu en volume — ±30% de v à
// Vélocité aléatoire 100%. Toujours à 0% par défaut.
export function randomizeGain(gain: number, randomVelocity: number, rng: () => number): number {
  if (randomVelocity <= 0) return gain;
  const variation = 1 + (rng() * 2 - 1) * randomVelocity * 0.3;
  return Math.max(0.05, gain * variation);
}
