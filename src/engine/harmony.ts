// Harmonie appliquée à un état — pont entre les fonctions pures de scales.ts
// et le PatternStateV2 (SYNTH_CHORDS de l'original devient un dérivé de
// l'état, jamais une globale).
import type { PatternStateV2, SynthRowState, SynthNote } from '../model/types';
import {
  SCALE_LIBRARY,
  currentScale,
  scaleDegreeFreq,
  buildChordsForScale,
  type ChordDef,
  type ScaleDef,
} from '../model/presets/scales';

export function scaleFor(state: PatternStateV2): ScaleDef {
  return currentScale(state.synthGlobal.scaleId);
}

export function chordsFor(state: PatternStateV2): ChordDef[] {
  return buildChordsForScale(scaleFor(state), state.synthGlobal.rootMidi, state.synthGlobal.chordCount);
}

export function degreeFreq(
  state: PatternStateV2,
  degree: number,
  octaveShift: number,
  registerSemitones = 0,
): number {
  return scaleDegreeFreq(scaleFor(state), state.synthGlobal.rootMidi, degree, octaveShift, registerSemitones);
}

// Fréquences d'un accord de nappe — -12 demi-tons : la Nappe n'a pas de
// contrôle d'octave par accord, sans cet ancrage elle restait bloquée au
// registre médium ("ne descend pas dans les basses").
export function chordFreqs(state: PatternStateV2, chords: ChordDef[], chordIdx: number): number[] {
  const chord = chords[chordIdx];
  if (!chord) return [];
  return chord.degrees.map((d) => degreeFreq(state, d, 0, -12));
}

// Chaque ligne synthé boucle sur `cycleBars` mesures, avec `subdivisions`
// notes réparties sur l'ENSEMBLE du cycle (pas par mesure) — "3 mesures,
// 15 notes" est parfaitement valide.
export function stepsForLine(row: SynthRowState): number {
  return Math.max(1, Math.round(row.subdivisions));
}
export function stepDurForLine(row: SynthRowState, barDur: number): number {
  return (Math.max(1, Math.round(row.cycleBars)) * barDur) / Math.max(1, Math.round(row.subdivisions));
}

// Accord de nappe actif à une position donnée (en mesures depuis le début de
// SON cycle) — sert au remplissage aléatoire ET à l'indicateur de justesse.
export function padChordAtBarPosition(state: PatternStateV2, barPos: number): number {
  const pad = state.synthRows.pad;
  const stepBars = pad.cycleBars / pad.subdivisions;
  const posInCycle = ((barPos % pad.cycleBars) + pad.cycleBars) % pad.cycleBars;
  const stepIdx = Math.min(pad.subdivisions - 1, Math.floor(posInCycle / stepBars));
  const v = pad.pattern[stepIdx];
  return typeof v === 'number' ? v : -1;
}

export function barPositionForStep(row: SynthRowState, stepIdx: number): number {
  return stepIdx * (row.cycleBars / row.subdivisions);
}

// Indicateur de justesse (purement informatif) : 'chord' (verte) =
// fondamentale/tierce/quinte de l'accord en cours ; 'tension' (ambre) = dans
// la gamme mais hors accord — jamais franchement fausse puisque la gamme est
// fixe ; null = pas d'accord actif à cet instant.
export function justesseForStep(
  state: PatternStateV2,
  chords: ChordDef[],
  row: SynthRowState,
  stepIdx: number,
  note: SynthNote | null,
): 'chord' | 'tension' | null {
  if (!note) return null;
  const chordIdx = padChordAtBarPosition(state, barPositionForStep(row, stepIdx));
  if (chordIdx < 0 || !chords[chordIdx]) return null;
  const chordDegrees = chords[chordIdx].degrees.map((d) => ((d - 1) % 7) + 1);
  return chordDegrees.includes(note.degree) ? 'chord' : 'tension';
}

export { SCALE_LIBRARY };
export type { ChordDef };
