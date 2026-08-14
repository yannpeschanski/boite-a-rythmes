// Modèle d'état central — forme EXACTE du format JSON v2 de l'original
// (exportState, boite-a-rythme-69.html l. 6338–6410). C'est LE contrat :
// stores Svelte, moteur audio, sérialisation, presets et undo/redo parlent
// tous ce format. Les champs runtime (stepIndex, nextStepTime…) n'en font
// PAS partie : ils vivent dans le moteur, pas dans l'état sérialisable.

export const MAXSTEPS = 32;

// clap/shaker (PLAN.md §6, retour de Yann 2026-08-13) : ajoutées après kick/
// snare/hat, jamais insérées entre elles — l'ordre du tableau/de l'union
// n'a pas d'importance pour la sérialisation (chaque ligne est nommée dans
// le JSON), mais l'ORDRE DE SCHEDULING (engine/scheduler.ts) est distinct et
// contraint par CLAUDE.md (ordre de consommation du générateur aléatoire) :
// clap/shaker y sont programmées après hat et avant la basse, jamais entre
// kick/snare/hat.
export type DrumRowName = 'kick' | 'snare' | 'hat' | 'clap' | 'shaker';
export type SynthRowName = 'bass' | 'pad' | 'melody';
export type LineName = DrumRowName | SynthRowName;

export const DRUM_ROW_NAMES: DrumRowName[] = ['kick', 'snare', 'hat', 'clap', 'shaker'];
export const SYNTH_ROW_NAMES: SynthRowName[] = ['bass', 'pad', 'melody'];

// kick/clap/shaker : 0/1 (binaire, pas de variante) ;
// snare : 0 = rien, 1 = normal, 2 = rim shot ;
// hat : 0 = rien, 1 = fermé, 2 = ouvert (choke automatique).
export type DrumStep = 0 | 1 | 2;

export interface DrumRowState {
  subdiv: number; // 1..32, subdivision propre à la ligne (polyrythmie)
  pattern: DrumStep[]; // longueur = subdiv à la sérialisation, MAXSTEPS en mémoire
  rolls: number[]; // rafales x1..x4 par pas
  shiftPct: number; // décalage -50..+50 (% d'un pas)
  volume: number;
  muted: boolean;
  // Timbre par ligne (module Timbre) — 0 partout = son d'origine exact
  pitch: number; // ±24 demi-tons
  attack: number; // 0..100 -> +0..80 ms
  decay: number; // -50..+50 -> ×0.71..×1.41
  tone: number; // 0..100, drive doux (kick surtout)
  filterCutoff: number; // passe-bas par ligne, 200..20000 Hz
  reverbSend: number; // 0..1
  delaySend: number; // 0..1
}

// bass/melody : { degree: 1..7, octave: -1|0|1 } ou null ;
// pad : index d'accord (0..chordCount-1) ou -1/null.
export interface SynthNote {
  degree: number;
  octave: number;
}
export type SynthStep = SynthNote | number | null;

// Champs de voix aux NOMS D'ORIGINE : c'est exactement ce que le format v2
// sérialise (`voice: r.voice` dans exportState) et ce que consomme
// playSynthNote — pas de couche de renommage entre les deux.
export interface SynthVoice {
  type?: OscillatorType;
  cutoff?: number;
  attack?: number;
  release?: number;
  attackCurve?: 'linear' | 'exponential';
  releaseCurve?: 'linear' | 'exponential';
  filterEnvAmount?: number;
  filterEnvRelease?: number;
  subGain?: number;
  detuneCents?: number;
  detuneGain?: number;
  chorusMix?: number;
  vibratoDepth?: number;
  vibratoRate?: number;
  resonance?: number;
  tone?: number;
  [k: string]: unknown;
}

export interface SynthRowState {
  cycleBars: number; // 1..16 mesures
  subdivisions: number; // 1..128 notes réparties sur le cycle
  pattern: SynthStep[];
  rolls: number[];
  voice: SynthVoice;
  volume: number;
  shiftPct: number;
  muted: boolean;
  reverbSend: number;
  delaySend: number;
  glide: number; // portamento (les 3 lignes, y compris nappe = glide par accord)
  strum?: number; // étalement d'accord — nappe seulement
}

export type DelayDivision = '16' | '8' | '8d' | '4';
export type ArpPattern = 'up' | 'down' | 'updown' | 'random';

export interface SynthGlobalState {
  rootMidi: number; // tonalité (12)
  scaleId: string; // voir SCALE_LIBRARY (5 modes)
  chordCount: number; // 4..7 triades diatoniques
  reverbSize: number; // 0..1 -> impulsion 0.5..3.5 s
  delayDivision: DelayDivision;
  delayFeedback: number;
  sidechainTriggerKick: boolean;
  sidechainTriggerSnare: boolean;
  sidechainTargetBass: boolean;
  sidechainTargetPad: boolean;
  sidechainTargetMelody: boolean;
  sidechainDepth: number;
  sidechainRelease: number;
  limitersEnabled: boolean;
  padArpEnabled: boolean;
  padArpPattern: ArpPattern | string;
  padArpRate: string; // notes par pas : '2' | '4' | '8'
  // Bourdon (PLAN.md §6, retour de Yann) : la Nappe ignore son propre motif
  // (cycleBars/subdivisions/pattern inchangés, juste pas lus) et tient de
  // longues notes sur l'accord du 1er pas, plutôt qu'une 4e ligne synthé
  // dédiée — même esprit que padArpEnabled, un mode plutôt qu'une ligne en
  // plus.
  padDroneEnabled: boolean;
}

export interface PatternStateV2 {
  version: 2;
  tempo: number; // 40..200 BPM
  swing: number; // 0..0.75, retarde les pas impairs (drum)
  drag: number; // 0..0.30, retard fixe de tous les pas (drum)
  synthSwing: number;
  synthDrag: number;
  randomVelocity: number; // 0..1
  spontRoll: number; // rafales spontanées 0..1
  fillEvery: number; // 0 = désactivé, sinon 2/4/8 mesures
  fillIntensity: number; // 0..1
  ghostDensity: number; // 0..0.4
  globalSaturation: number; // 0..1 (bus drum)
  globalCompression: number; // 0..1
  globalBitcrush: number; // 0..1
  finalVolume: number; // 0.5..1.5
  rows: Record<DrumRowName, DrumRowState>;
  synthRows: Record<SynthRowName, SynthRowState>;
  synthGlobal: SynthGlobalState;
  // Ligne cible des ghost notes ('snare' par défaut). Champ absent du format
  // v2 d'origine (jamais sérialisé par exportState) — optionnel et toléré à
  // l'import, l'original l'ignorerait sans broncher.
  ghostRow?: DrumRowName;
}

// ---- Presets de morceau (34) — mêmes données que l'original, typées ----
export interface SongPreset {
  id: string;
  label: string;
  category: string;
  history?: string; // contexte historique (textes pédagogiques, à préserver)
  demo?: string; // modules illustrés par le preset
  state: Partial<PatternStateV2>; // fragment d'état appliqué au chargement
  noteSeed?: number; // remplissage synthé déterministe
}

// ---- Niveaux du mode jeu (34) ----
export interface LevelDef {
  id: number;
  title: string;
  concept: string; // le concept introduit par le niveau
  kind: 'generated' | 'preset';
  presetId?: string;
  params?: Record<string, unknown>; // subdiv, shift forcé, ghost/fill ajoutés…
}
