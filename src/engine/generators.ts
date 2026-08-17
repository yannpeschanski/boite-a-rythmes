// Remplissage aléatoire harmonieux — port de randomizePad/randomizePitchedLine/
// randomizeSynth/applyRandomRolls (l. 3437–3581). `rng` injectable :
// Math.random pour le bouton manuel, makeSeededRng(noteSeed) pour les presets
// (rendu déterministe, pas un tirage différent à chaque rechargement).
import type { PatternStateV2, SynthRowName, SynthNote, DrumRowName, DrumStep } from '../model/types';
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
  // Filet : une ligne qui se charge ENTIÈREMENT vide a l'air cassée, pas
  // aérée. Le cas est rare mais réel — chaque pas est un tirage indépendant,
  // donc sur une ligne à peu de pas (8 sur 4 mesures pour plusieurs presets)
  // la série peut sortir vide par accident de graine. Constaté sur `clave23`
  // en baissant la densité de la mélodie (2026-08-17) : le preset se
  // chargeait sans une seule note de mélodie.
  //
  // Posé sur le PREMIER pas, et sur la fondamentale de l'accord actif —
  // l'endroit et la note qui ne peuvent pas sonner faux. Surtout : AUCUN
  // tirage supplémentaire (`degrees[0]`, pas `randomChordToneDegree`), donc
  // le flux du générateur n'est pas décalé et le rendu reste reproductible
  // à graine égale.
  // `some(...)` plutôt que `every(v => v == null)` : TypeScript infère un
  // prédicat de type sur le second et réduit alors `row.pattern` à `null[]`,
  // ce qui interdit d'y écrire la note qu'on vient justement de fabriquer.
  if (row.pattern.length > 0 && !row.pattern.some((v) => v != null)) {
    const chordIdx = padChordAtBarPosition(state, barPositionForStep(row, 0));
    const degrees = chordIdx >= 0 && chords[chordIdx] ? chords[chordIdx].degrees : null;
    const deg = degrees && degrees.length > 0 ? ((degrees[0] - 1) % 7) + 1 : 1;
    row.pattern[0] = { degree: deg, octave: cfg.defaultOctave };
  }
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
  // Mélodie : plus de notes de passage (rôle mélodique).
  //
  // FACTEUR 0.6 sur la mélodie (2026-08-17, retour de Yann : « les mélodies
  // des presets ne sont pas très bien réglées et prennent souvent trop de
  // place »). Elle recevait `fillRate` PLEIN POT là où la basse reçoit
  // `fillRate * 0.75` — au moment précis où c'est elle qui a la subdivision
  // la plus fine (melodySubdiv vaut 8 ou 16 selon les presets, contre 4 pour
  // la nappe). Elle finissait donc ligne la plus dense dans 21 presets sur
  // 34 : 1,86 note/mesure en moyenne contre 1,15 pour la basse et 0,83 pour
  // la nappe. (21 et non 31 : le premier relevé, fait à l'œil sur un
  // tableau, surcomptait — c'est le script qui fait foi.)
  //
  // 0.6 et pas moins, mesuré sur les 34 presets plutôt que choisi au jugé :
  //   facteur 1.00 -> 1,86 note/mesure (pire cas 7,0)
  //   facteur 0.60 -> 1,12            (pire cas 4,5)   <- ici
  //   facteur 0.50 -> 0,99            (pire cas 4,5)
  // 0.6 est le point où la mélodie repasse SOUS la basse (1,12 < 1,15),
  // c'est-à-dire où elle cesse d'être la ligne la plus chargée ; descendre
  // à 0.5 ne gagne plus rien sur les pires cas et creuse l'écart sans
  // raison. Le plus petit changement qui règle le problème.
  //
  // Ce que ça change et ce que ça ne change pas : les 34 PRESETS sonnent
  // désormais avec une mélodie plus aérée (c'est le but). Les morceaux
  // SAUVEGARDÉS ne bougent pas — la sérialisation stocke les notes, pas la
  // graine. Et le déterminisme est intact : à graine égale, le résultat
  // reste reproductible à l'octet près, c'est seulement le résultat qui a
  // changé, pas sa stabilité.
  randomizePitchedLine(state, 'bass', fillRate * 0.75, 0.85, rng);
  randomizePitchedLine(state, 'melody', fillRate * 0.6, 0.7, rng);
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

// Rythme euclidien (algorithme de Bjorklund) — répartit `pulses` coups le
// plus uniformément possible sur `steps` pas (PLAN.md §6, « Générateur
// euclidien »). Implémentation par bissection de groupes homogènes plutôt
// que la récursion originale de Bjorklund : même résultat, plus simple à
// lire. Cas limites : pulses<=0 -> tout silencieux, pulses>=steps -> tout
// actif, plutôt que planter ou boucler sur un cas dégénéré.
export function euclideanRhythm(steps: number, pulses: number): boolean[] {
  const n = Math.max(1, Math.round(steps));
  const k = Math.max(0, Math.min(n, Math.round(pulses)));
  if (k === 0) return new Array(n).fill(false);
  if (k === n) return new Array(n).fill(true);
  let groups: boolean[][] = Array.from({ length: k }, () => [true]);
  let remainder: boolean[][] = Array.from({ length: n - k }, () => [false]);
  // À chaque tour, on accole le plus de paires groupe/reste possible ; ce
  // qui ne rentre pas dans une paire devient le nouveau "reste" à répartir
  // au tour suivant — la bissection s'arrête dès qu'il ne reste plus qu'un
  // seul groupe de reste (plus rien à distribuer plus finement).
  while (remainder.length > 1) {
    const pairs = Math.min(groups.length, remainder.length);
    const merged: boolean[][] = [];
    for (let i = 0; i < pairs; i++) merged.push([...groups[i], ...remainder[i]]);
    const leftoverGroups = groups.slice(pairs);
    const leftoverRemainder = remainder.slice(pairs);
    groups = merged;
    remainder = leftoverGroups.length ? leftoverGroups : leftoverRemainder;
  }
  return groups.concat(remainder).flat();
}

// Applique un rythme euclidien à une ligne drum — remplace tout le contenu
// existant (état 1, simple, pas d'accent/rim : « répartir uniformément »
// n'est pas un choix d'accentuation) et réinitialise les rafales.
export function applyEuclideanRhythm(state: PatternStateV2, name: DrumRowName, pulses: number): void {
  const row = state.rows[name];
  row.pattern = euclideanRhythm(row.subdiv, pulses).map((on) => (on ? 1 : 0)) as DrumStep[];
  row.rolls = new Array(row.subdiv).fill(1);
}
