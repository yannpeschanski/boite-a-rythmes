// Théorie musicale « données » — portée VERBATIM de boite-a-rythme-69.html
// (l. 6644–6759) : gammes, noms de notes, ordre de priorité des accords et
// construction des triades diatoniques. Fonctions pures, zéro DOM, zéro audio.
//
// ÉCARTS/ADAPTATIONS de portage (données inchangées) :
// - L'original s'appuyait sur trois globales mutables (`let synthRootMidi = 60`,
//   `let synthScaleId = 'major'`, `let synthChordCount = 4`) : elles sont
//   exposées ici comme constantes DEFAULT_* et les fonctions qui les lisaient
//   (currentScale, scaleDegreeFreq) reçoivent la valeur en paramètre — même
//   corps, même logique.

// ================================================================
// Atelier Synthé — Phase 1 : fondations (gamme, accords, moteur de voix)
// Aucune UI ici : ce bloc pose uniquement les données et les fonctions de
// synthèse que l'Atelier Synthé (Phase 2) et la campagne (Phase 4) viendront
// consommer. Rien ci-dessous ne modifie le comportement existant du rythme.
// ================================================================

export interface ScaleDef {
  id: string;
  label: string;
  intervals: number[];
}

export type ChordQuality = 'maj' | 'min' | 'dim';

export interface ChordDef {
  id: string;
  roman: string;
  label: string;
  degrees: number[];
  root: number;
}

// ---------- Gamme, réglable (tonalité + mode) ----------
// Par défaut : Do majeur, identique au comportement fixe d'avant cette
// section. Basse/Nappe/Mélodie continuent de puiser dans la MÊME gamme, donc
// rien ne peut sonner faux entre elles — seule la gamme elle-même devient
// réglable, pas la cohérence entre les lignes.
// Limité à des modes à 7 notes (tous des modes de la gamme majeure) : le
// reste de l'appli (cycle de degré 1-7 au clic, justesseForStep, etc.) est
// câblé sur une gamme à 7 notes — une gamme à 5 ou 6 notes casserait ce
// modèle (quel degré 6 ou 7 jouer sur une pentatonique ?), donc hors scope.
export const ROOT_NOTE_NAMES = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
export const SCALE_LIBRARY: ScaleDef[] = [
  { id: 'major',      label: 'Majeur (Ionien)',        intervals: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'minor',      label: 'Mineur naturel (Éolien)', intervals: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'dorian',     label: 'Dorien',                  intervals: [0, 2, 3, 5, 7, 9, 10] },
  { id: 'phrygian',   label: 'Phrygien',                intervals: [0, 1, 3, 5, 7, 8, 10] },
  { id: 'mixolydian', label: 'Mixolydien',              intervals: [0, 2, 4, 5, 7, 9, 10] },
];
export const DEFAULT_SYNTH_ROOT_MIDI = 60; // Do médium (do3/C4 selon la notation) — défaut identique à avant
export const DEFAULT_SYNTH_SCALE_ID = 'major';
export const DEFAULT_SYNTH_CHORD_COUNT = 4;
export function currentScale(scaleId: string): ScaleDef {
  return SCALE_LIBRARY.find(s => s.id === scaleId) || SCALE_LIBRARY[0];
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Degré de gamme 1-indexé (comme on le dit à l'oral : "le 3e degré") -> fréquence.
// `octaveShift` (-1/0/+1) est la même logique d'interaction qu'une variante
// rythmique : un état de plus sur une note déjà posée, pas un réglage à part.
// Les notes déjà posées (stockées en degrés, pas en fréquences) suivent donc
// automatiquement un changement de tonalité/gamme, sans rien à migrer.
// `registerSemitones` : décalage FIXE en demi-tons, indépendant de octaveShift
// — sert à ancrer chaque ligne dans un registre cohérent avec son rôle (voir
// playBassNote/chordFreqs) plutôt que de tout calculer autour du même Do
// médium partagé par les 3 lignes.
export function scaleDegreeFreq(scale: ScaleDef, rootMidi: number, degree: number, octaveShift?: number, registerSemitones?: number): number {
  octaveShift = octaveShift || 0;
  registerSemitones = registerSemitones || 0;
  const intervals = scale.intervals;
  const idx = ((degree - 1) % 7 + 7) % 7;
  const octave = Math.floor((degree - 1) / 7) + octaveShift;
  return midiToFreq(rootMidi + intervals[idx] + octave * 12 + registerSemitones);
}

// ---------- Accords ----------
// Générés dynamiquement à partir de la gamme courante (triades empilées en
// tierces, degré par degré) — plus de liste figée. Une gamme à 7 notes a
// exactement 7 triades diatoniques possibles (I à vii°) ; l'ordre de priorité
// ci-dessous privilégie les 4 plus consonantes/reconnaissables (I-IV-V-vi,
// l'ordre pop classique) avant les 3 plus "colorées" (ii, iii, vii°), pour
// que "Nombre d'accords"=4 reproduise exactement le comportement d'avant
// cette section, quels que soient la tonalité et le mode choisis.
export const CHORD_PRIORITY_ORDER = [1, 4, 5, 6, 2, 3, 7];
export const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
export function noteNameForScaleDegree(scale: ScaleDef, rootMidiVal: number, degree: number): string {
  const idx = ((degree - 1) % 7 + 7) % 7;
  const midi = rootMidiVal + scale.intervals[idx];
  return ROOT_NOTE_NAMES[((midi % 12) + 12) % 12];
}
// Qualité d'une triade empilée en tierces à partir d'un degré donné (majeur/
// mineur/diminué), déduite des intervalles réels de la gamme — pas supposée.
export function chordQualityAt(scale: ScaleDef, root: number): ChordQuality {
  const get = (d: number): number => {
    const idx = ((d - 1) % 7 + 7) % 7;
    return scale.intervals[idx] + 12 * Math.floor((d - 1) / 7);
  };
  const third = get(root + 2) - get(root);
  const fifth = get(root + 4) - get(root);
  if (third === 4 && fifth === 7) return 'maj';
  if (third === 3 && fifth === 7) return 'min';
  if (third === 3 && fifth === 6) return 'dim';
  return 'maj'; // filet de sécurité, ne devrait pas arriver sur un mode de la gamme majeure
}
export function qualityLabel(quality: ChordQuality): string {
  if (quality === 'maj') return 'majeur';
  if (quality === 'min') return 'mineur';
  return 'diminué';
}
export function buildChordsForScale(scale: ScaleDef, rootMidiVal: number, count: number): ChordDef[] {
  return CHORD_PRIORITY_ORDER.slice(0, count).map(root => {
    const quality = chordQualityAt(scale, root);
    let roman = ROMAN_NUMERALS[(root - 1) % 7];
    if (quality !== 'maj') roman = roman.toLowerCase();
    if (quality === 'dim') roman += '°';
    const noteName = noteNameForScaleDegree(scale, rootMidiVal, root);
    return {
      id: 'deg' + root,
      roman: roman,
      label: roman + ' (' + noteName + ' ' + qualityLabel(quality) + ')',
      degrees: [root, root + 2, root + 4],
      root: root,
    };
  });
}
