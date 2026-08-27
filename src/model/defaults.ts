// État initial — mêmes valeurs par défaut que l'original (rows l. 2127–2134,
// sliders du HTML). Le pattern par défaut : kick sur 1 et 3, snare sur 2 et 4,
// hat en 3 pas (polyrythmie d'accueil).
import {
  MAXSTEPS,
  DRUM_ROW_NAMES,
  SYNTH_ROW_NAMES,
  type PatternStateV2,
  type DrumRowState,
  type SynthRowState,
  type SynthRowName,
  type SynthGlobalState,
} from './types';
import { defaultSynthVoice } from './presets/voices';

function defaultDrumRow(subdiv: number, volume: number): DrumRowState {
  return {
    subdiv,
    pattern: new Array(MAXSTEPS).fill(0),
    rolls: new Array(MAXSTEPS).fill(1),
    shiftPct: 0,
    volume,
    muted: false,
    pitch: 0,
    attack: 0,
    decay: 0,
    tone: 0,
    filterCutoff: 20000,
    reverbSend: 0,
    delaySend: 0,
  };
}

// Grilles par défaut de l'original : Nappe 4 mesures / 4 accords,
// Basse/Mélodie 1 mesure / 4 notes.
function defaultSynthRow(name: SynthRowName): SynthRowState {
  const isPad = name === 'pad';
  const subdivisions = 4;
  return {
    cycleBars: isPad ? 4 : 1,
    subdivisions,
    pattern: new Array(subdivisions).fill(isPad ? -1 : null),
    rolls: new Array(subdivisions).fill(1),
    voice: defaultSynthVoice(name),
    volume: 1,
    shiftPct: 0,
    muted: false,
    reverbSend: 0,
    delaySend: 0,
    glide: 0,
    ...(isPad ? { strum: 0 } : {}),
  };
}

// Redimensionne une ligne synthé (cycles/subdivisions) en préservant le
// contenu existant — port de resizeSynthLine.
export function resizeSynthLine(row: SynthRowState, cycleBars: number, subdivisions: number, isPad: boolean): void {
  const n = Math.max(1, Math.round(subdivisions));
  row.cycleBars = Math.max(1, Math.round(cycleBars));
  const fill = isPad ? -1 : null;
  const pattern = new Array(n).fill(fill);
  const rolls = new Array(n).fill(1);
  for (let i = 0; i < Math.min(n, row.pattern.length); i++) pattern[i] = row.pattern[i];
  for (let i = 0; i < Math.min(n, row.rolls.length); i++) rolls[i] = row.rolls[i];
  row.subdivisions = n;
  row.pattern = pattern;
  row.rolls = rolls;
}

export function defaultSynthGlobal(): SynthGlobalState {
  return {
    rootMidi: 60, // Do médium — défaut identique à l'original
    scaleId: 'major',
    chordCount: 4,
    reverbSize: 40,
    delayDivision: '0.25' as SynthGlobalState['delayDivision'],
    delayFeedback: 35,
    sidechainTriggerKick: false,
    sidechainTriggerSnare: false,
    sidechainTargetBass: false,
    sidechainTargetPad: false,
    sidechainTargetMelody: false,
    sidechainDepth: 60,
    sidechainRelease: 180,
    limitersEnabled: true,
    padArpEnabled: false,
    padArpPattern: 'up',
    padArpRate: '4',
    padDroneEnabled: false,
  };
}

/* La TABLE RASE — un Atelier vraiment vide.
 *
 * `defaultState()` n'est pas une grille vide : c'est le motif d'accueil, et ce
 * motif EST du Motown (`rankPresets` lui donne 100 %). Ouvrir une commande
 * dessus cochait donc des cases du cahier avant que le joueur ait touché quoi
 * que ce soit — retour de Yann après une partie complète : *« la check-list
 * dans l'atelier est déjà remplie quand on ouvre l'exercice. Il faut que
 * l'atelier soit bien vide. »*
 *
 * Une commande demande de PRODUIRE : elle doit partir de rien. Tout le reste
 * de l'état (tempo, timbres, voix de synthé) est conservé — c'est le contenu
 * qu'on efface, pas les réglages de la machine. */
export function etatVierge(): PatternStateV2 {
  const st = defaultState();
  for (const l of DRUM_ROW_NAMES) {
    st.rows[l].pattern = new Array(MAXSTEPS).fill(0);
    st.rows[l].rolls = new Array(MAXSTEPS).fill(1);
    st.rows[l].muted = false;
  }
  for (const l of SYNTH_ROW_NAMES) {
    const r = st.synthRows[l];
    r.pattern = new Array(r.subdivisions).fill(l === 'pad' ? -1 : null);
    r.muted = false;
  }
  return st;
}

export function defaultState(): PatternStateV2 {
  const kick = defaultDrumRow(4, 1.0);
  const snare = defaultDrumRow(4, 0.9);
  const hat = defaultDrumRow(3, 0.7);
  // Clap/shaker (PLAN.md §6) : motif vide à l'accueil, contrairement à
  // kick/snare/hat — ce sont des voix en plus à découvrir, pas une base
  // attendue dès le premier chargement. Un vieux fichier de sauvegarde sans
  // ces deux lignes retombe exactement sur ces mêmes valeurs par défaut
  // (model/serialize.ts, deserializeState part de defaultState()).
  const clap = defaultDrumRow(4, 0.85);
  const shaker = defaultDrumRow(8, 0.5);
  kick.pattern[0] = 1;
  kick.pattern[2] = 1;
  snare.pattern[1] = 1;
  snare.pattern[3] = 1;
  hat.pattern[0] = 1;
  hat.pattern[1] = 1;
  hat.pattern[2] = 1;
  return {
    version: 2,
    tempo: 120,
    swing: 0,
    drag: 0,
    synthSwing: 0,
    synthDrag: 0,
    randomVelocity: 0,
    spontRoll: 0,
    fillEvery: 0,
    fillIntensity: 50,
    ghostDensity: 0,
    globalSaturation: 0,
    globalCompression: 0,
    globalBitcrush: 0,
    finalVolume: 100,
    rows: { kick, snare, hat, clap, shaker },
    synthRows: {
      bass: defaultSynthRow('bass'),
      pad: defaultSynthRow('pad'),
      melody: defaultSynthRow('melody'),
    },
    synthGlobal: defaultSynthGlobal(),
    ghostRow: 'snare',
  };
}
