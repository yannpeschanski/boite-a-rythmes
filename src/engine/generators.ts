// Remplissage aléatoire harmonieux — port de randomizePad/randomizePitchedLine/
// randomizeSynth/applyRandomRolls (l. 3437–3581). `rng` injectable :
// Math.random pour le bouton manuel, makeSeededRng(noteSeed) pour les presets
// (rendu déterministe, pas un tirage différent à chaque rechargement).
import type { PatternStateV2, SynthRowName, SynthNote } from '../model/types';
import { resizeSynthLine } from '../model/defaults';
import { padChordAtBarPosition, barPositionForStep, chordsFor, type ChordDef } from './harmony';
import { arpNoteOrder } from './voices/synth';
import type { Rng } from './rng';

// 4 enchaînements parmi les plus courants en pop/variété (indices : 0=I,
// 1=IV, 2=V, 3=vi) — on tire un gabarit entier plutôt que chaque accord
// séparément, pour garantir un enchaînement qui sonne bien.
export const CHORD_PROGRESSIONS: number[][] = [
  [0, 3, 1, 2], // I - vi - IV - V
  [0, 1, 2, 3], // I - IV - V - vi
  [0, 2, 3, 1], // I - V - vi - IV
  [3, 1, 0, 2], // vi - IV - I - V
];

const PITCHED_LINE_CONFIG: Record<'bass' | 'melody', { defaultOctave: number }> = {
  bass: { defaultOctave: 0 },
  melody: { defaultOctave: 0 },
};

// Un accord tiré au hasard dans le gabarit à CHAQUE pas rempli — ça
// randomise vraiment sur toute la subdivision, quel que soit le nombre de
// mesures (les versions indexées par position répétaient le même bloc de 4).
export function randomizePad(state: PatternStateV2, fillRate: number, rng: Rng): void {
  const row = state.synthRows.pad;
  const template = CHORD_PROGRESSIONS[Math.floor(rng() * CHORD_PROGRESSIONS.length)];
  row.pattern = row.pattern.map(() => {
    if (rng() >= fillRate) return -1;
    return template[Math.floor(rng() * template.length)];
  });
}

// Un degré tiré DANS l'accord donné — les degrés peuvent dépasser 7 (la
// quinte du IV est le degré 8), ramenés dans 1-7.
function randomChordToneDegree(chords: ChordDef[], chordIdx: number, rng: Rng): number {
  const degrees = chords[chordIdx].degrees;
  const deg = degrees[Math.floor(rng() * degrees.length)];
  return ((deg - 1) % 7) + 1;
}

// Basse/Mélodie : à chaque pas retenu, note de l'accord de nappe actif la
// plupart du temps, avec une proportion de notes de passage pour ne pas
// sonner mécanique — jamais franchement fausses (gamme fixe).
export function randomizePitchedLine(
  state: PatternStateV2,
  name: 'bass' | 'melody',
  density: number,
  chordToneChance: number,
  rng: Rng,
): void {
  const cfg = PITCHED_LINE_CONFIG[name];
  const row = state.synthRows[name];
  const chords = chordsFor(state);
  row.pattern = row.pattern.map((_, i): SynthNote | null => {
    if (rng() > density) return null;
    const chordIdx = padChordAtBarPosition(state, barPositionForStep(row, i));
    const degree =
      chordIdx >= 0 && chords[chordIdx] && rng() < chordToneChance
        ? randomChordToneDegree(chords, chordIdx, rng)
        : 1 + Math.floor(rng() * 7);
    return { degree, octave: cfg.defaultOctave };
  });
}

export function randomizeSynth(state: PatternStateV2, fillRate: number, rng: Rng): void {
  randomizePad(state, fillRate, rng); // d'abord la nappe : basse/mélodie s'appuient dessus
  // Aligne les cycles de basse/mélodie sur celui de la nappe : sinon le
  // tirage harmonieux ne porterait que sur le premier accord de la
  // progression. Ne change que le nombre de mesures, jamais le nombre de
  // notes déjà choisi.
  (['bass', 'melody'] as const).forEach((name) => {
    resizeSynthLine(state.synthRows[name], state.synthRows.pad.cycleBars, state.synthRows[name].subdivisions, false);
  });
  // Basse : moins dense, très majoritairement des notes d'accord (fondation).
  // Mélodie : suit le taux réglé, plus de notes de passage (rôle mélodique).
  randomizePitchedLine(state, 'bass', fillRate * 0.75, 0.85, rng);
  randomizePitchedLine(state, 'melody', fillRate, 0.7, rng);
}

// Sème des rafales (x2 à x4) sur les pas déjà actifs, probabilité `rate` par
// pas — jamais sur un pas silencieux. Utilisé par les presets (rollRate) avec
// le même rng que randomizeSynth pour rester déterministe d'un bloc.
export function applyRandomRolls(state: PatternStateV2, name: SynthRowName, rate: number, rng: Rng): void {
  if (!rate) return;
  const row = state.synthRows[name];
  row.pattern.forEach((v, i) => {
    const active = name === 'pad' ? typeof v === 'number' && v >= 0 : v != null;
    if (active && rng() < rate) row.rolls[i] = 2 + Math.floor(rng() * 3); // x2 à x4
  });
}

// Traduit l'arpège de la Nappe (playPadArp/arpNoteOrder, voices/synth.ts —
// même logique de motif/ordre) en notes réellement posées sur la ligne
// Mélodie — jusqu'ici l'arpège n'existait qu'en temps réel à la lecture,
// jamais comme des notes éditables (original padArpToMelodyBtn, l. 3387,
// jamais porté — PLAN.md §7.3). Redimensionne la Mélodie pour avoir une
// case par note d'arpège (nombre de pas Nappe × vitesse d'arpège), calée
// sur les mêmes mesures que la Nappe. Remplace tout le contenu existant de
// la Mélodie — instantané figé de l'arpège du moment, pas un lien live.
export function translatePadArpToMelody(state: PatternStateV2, rng: Rng): void {
  const pad = state.synthRows.pad;
  const pattern = state.synthGlobal.padArpPattern;
  const rate = Math.max(1, parseInt(state.synthGlobal.padArpRate, 10) || 4);
  const oldSteps = pad.pattern.length;
  // Plafonné à 128 (même maximum que le curseur "Notes du cycle") : au-delà,
  // les notes d'arpège en trop sont simplement ignorées plutôt que de tenter
  // un tableau plus grand que ce que l'UI sait gérer.
  const newSubdiv = Math.min(128, oldSteps * rate);
  resizeSynthLine(state.synthRows.melody, pad.cycleBars, newSubdiv, false);
  const melody = state.synthRows.melody;
  const chords = chordsFor(state);
  for (let i = 0; i < oldSteps; i++) {
    const chordIdx = pad.pattern[i];
    if (typeof chordIdx !== 'number' || chordIdx < 0) continue; // pas d'accord ici -> silence en Mélodie aussi
    const chord = chords[chordIdx];
    if (!chord) continue;
    const order = arpNoteOrder(pattern, chord.degrees.length, rate, rng);
    order.forEach((idx, k) => {
      const targetStep = i * rate + k;
      if (targetStep >= newSubdiv) return; // au-delà du plafond ci-dessus
      const d = chord.degrees[idx];
      // Le degré n'est représentable que 1-7 : on replie l'octave en trop
      // (chord.degrees peut dépasser 7, ex. root=7 -> 11) dans `octave`
      // plutôt que d'écrire un degré hors plage.
      const wrapped = (((d - 1) % 7) + 7) % 7 + 1;
      const extraOctave = Math.floor((d - 1) / 7);
      // -1 de base : chordFreqs joue la Nappe un octave plus bas (-12
      // demi-tons) que le registre par défaut de la Mélodie — sans ce
      // décalage, la mélodie traduite sonnerait une octave trop haut par
      // rapport à l'accord d'origine. Bornée à [-1,1], seule plage que
      // l'UI (▲▼) sait représenter.
      const octave = Math.max(-1, Math.min(1, -1 + extraOctave));
      melody.pattern[targetStep] = { degree: wrapped, octave };
    });
  }
}
