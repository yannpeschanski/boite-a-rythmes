// Adaptateur presets (forme plate d'origine) -> PatternStateV2.
// Port de loadPreset (l. 6169–6325), sans la couche DOM : ici on produit un
// état, la réactivité Svelte fait le reste.
//
// Principe repris de l'original : JAMAIS d'héritage silencieux d'un preset à
// l'autre. Tout champ absent retombe sur un défaut fixe, pas sur la valeur du
// preset précédent.
import { MAXSTEPS, type PatternStateV2, type DrumRowName, type DrumStep, type SynthRowName } from './types';
import type { SongPresetData, DrumLinePresetData } from './presets/songs';
import { defaultState, resizeSynthLine } from './defaults';
import { defaultSynthVoice } from './presets/voices';
import { makeSeededRng } from '../engine/rng';
import { randomizeSynth, applyRandomRolls } from '../engine/generators';

function applyDrumLine(dst: PatternStateV2['rows'][DrumRowName], src: DrumLinePresetData): void {
  dst.subdiv = src.subdiv;
  const pat = src.pattern.map((v): DrumStep => (v === true ? 1 : v === 2 ? 2 : v ? 1 : 0));
  dst.pattern = pat.concat(new Array(Math.max(0, MAXSTEPS - pat.length)).fill(0)).slice(0, MAXSTEPS);
  const rolls = src.rolls ?? [];
  dst.rolls = new Array(MAXSTEPS).fill(1).map((one, i) => rolls[i] ?? one);
  dst.shiftPct = src.shift;
  // Les presets portent le volume en pourcents (100 = plein), l'état interne
  // en 0..1 — même conversion que loadPreset dans l'original.
  dst.volume = src.volume / 100;
  dst.muted = false;
  dst.pitch = src.pitch;
  dst.attack = src.attack;
  dst.decay = src.decay;
  dst.tone = src.tone;
}

// `keepSynthAndTempo` = case « Garder le synthé et le tempo actuels » : quand
// elle est cochée, on ne touche à rien du synthé (voix, harmonie, grille,
// notes, envois, sidechain, groove synthé) NI au tempo — l'état réglé à la
// main par le joueur survit au chargement d'un preset de rythme. Extension
// délibérée par rapport à l'original (qui ne gardait que le synthé, jamais le
// tempo) : recharger un preset de rythme au milieu d'une session ne doit pas
// faire sauter le tempo sur lequel le synthé en cours a été composé.
export function presetToState(
  preset: SongPresetData,
  current?: PatternStateV2,
  keepSynthAndTempo = false,
): PatternStateV2 {
  const state = defaultState();

  if (keepSynthAndTempo && current) {
    state.synthRows = structuredClone(current.synthRows);
    state.synthGlobal = structuredClone(current.synthGlobal);
    state.synthSwing = current.synthSwing;
    state.synthDrag = current.synthDrag;
  } else {
    applyPresetSynth(state, preset);
  }

  state.tempo = keepSynthAndTempo && current ? current.tempo : preset.tempo;
  state.swing = preset.swing;
  state.drag = preset.drag;
  state.randomVelocity = 0; // jamais réglée par un preset, ne persiste pas
  state.spontRoll = preset.spontRoll ?? 0;
  state.fillEvery = preset.fillEvery ?? 0;
  state.fillIntensity = 70; // défaut de loadPreset quand le preset n'en porte pas
  state.ghostDensity = preset.ghostDensity ?? 0;
  state.ghostRow = (preset.ghostRow as DrumRowName) || 'snare';
  state.globalSaturation = preset.globalSaturation ?? 0;
  state.globalCompression = preset.globalCompression ?? 0;
  state.globalBitcrush = preset.globalBitcrush ?? 0;
  applyDrumLine(state.rows.kick, preset.kick);
  applyDrumLine(state.rows.snare, preset.snare);
  applyDrumLine(state.rows.hat, preset.hat);
  return state;
}

// Voix, harmonie, grille, remplissage déterministe, envois fx, sidechain.
function applyPresetSynth(state: PatternStateV2, p: SongPresetData): void {
  // Voix : celle du preset par-dessus la voix par défaut de la ligne — un
  // preset sans réglage propre n'hérite jamais du preset précédent.
  (['bass', 'pad', 'melody'] as SynthRowName[]).forEach((name) => {
    state.synthRows[name].voice = { ...defaultSynthVoice(name), ...(p.synthVoice?.[name] || {}) };
  });

  // Harmonie — défaut fixe (Do majeur, 4 accords) si le preset n'en porte pas.
  const harmony = p.harmony || { rootOffset: 0, scaleId: 'major', chordCount: 4 };
  state.synthGlobal.rootMidi = 60 + harmony.rootOffset;
  state.synthGlobal.scaleId = harmony.scaleId;
  state.synthGlobal.chordCount = harmony.chordCount;

  // Grille — sans synthGrid, valeurs d'origine (Nappe 4 mesures/4,
  // Basse/Mélodie 1 mesure/4).
  const grid = p.synthGrid || { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 4, melodySubdiv: 4 };
  resizeSynthLine(state.synthRows.pad, grid.padCycleBars, grid.padSubdiv, true);
  // cycleBars de bass/melody réaligné sur la Nappe par randomizeSynth
  resizeSynthLine(state.synthRows.bass, 1, grid.bassSubdiv, false);
  resizeSynthLine(state.synthRows.melody, 1, grid.melodySubdiv, false);

  // Remplissage des grilles — graine fixe : rendu déterministe, pas un
  // tirage différent à chaque rechargement du même preset. Sans noteSeed, on
  // vide plutôt que de laisser les notes du preset précédent.
  if (p.noteSeed != null) {
    const rng = makeSeededRng(p.noteSeed);
    const fillRate = (p.synthFillRate != null ? p.synthFillRate : 65) / 100;
    randomizeSynth(state, fillRate, rng);
    // Rafales : même rng, poursuivi après le remplissage plutôt que
    // ré-initialisé, pour que la séquence entière reste déterministe d'un bloc.
    const fxForRolls = p.synthFx || ({} as SongPresetData['synthFx']);
    (['bass', 'pad', 'melody'] as SynthRowName[]).forEach((name) => {
      applyRandomRolls(state, name, fxForRolls[name]?.rollRate || 0, rng);
    });
  } else {
    state.synthRows.pad.pattern = state.synthRows.pad.pattern.map(() => -1);
    state.synthRows.bass.pattern = state.synthRows.bass.pattern.map(() => null);
    state.synthRows.melody.pattern = state.synthRows.melody.pattern.map(() => null);
  }

  // Envois réverbe/delay, glide, étalement — repli à 0 si absent.
  const fx = p.synthFx || ({} as SongPresetData['synthFx']);
  (['bass', 'pad', 'melody'] as SynthRowName[]).forEach((name) => {
    const f = fx[name] || { reverbSend: 0, delaySend: 0 };
    state.synthRows[name].reverbSend = f.reverbSend || 0;
    state.synthRows[name].delaySend = f.delaySend || 0;
    state.synthRows[name].glide = f.glide || 0;
    if (name === 'pad') state.synthRows.pad.strum = f.strum || 0;
  });

  // Sidechain — les presets gardent l'ancien format (un seul trigger/target à
  // la fois), traduit ici vers les cases à cocher. Sans réglage explicite :
  // aucun déclencheur, plutôt que d'hériter (ex. la pompe house qui
  // continuerait sur un preset qui n'en veut pas).
  const sc = p.sidechain || { trigger: 'none' as const, target: 'all' as const, depth: 60, release: 180 };
  const sg = state.synthGlobal;
  sg.sidechainTriggerKick = sc.trigger === 'kick';
  sg.sidechainTriggerSnare = sc.trigger === 'snare';
  sg.sidechainTargetBass = sc.target === 'all' || sc.target === 'bass';
  sg.sidechainTargetPad = sc.target === 'all' || sc.target === 'pad';
  sg.sidechainTargetMelody = sc.target === 'all' || sc.target === 'melody';
  sg.sidechainDepth = sc.depth;
  sg.sidechainRelease = sc.release;
  // Arpégiateur : jamais réglé par un preset, revient à "désactivé".
  sg.padArpEnabled = false;
  sg.padArpPattern = 'up';
  sg.padArpRate = '4';
}
