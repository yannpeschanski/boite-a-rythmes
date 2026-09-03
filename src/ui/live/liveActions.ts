// Catalogue des actions/axes assignables du Mode Live (phase 3, PLAN.md §7)
// — un bouton/axe ne code plus en dur "ce qu'il fait", il pointe vers une de
// ces définitions, et l'association est modifiable depuis l'overlay ⚙ (liste
// scrollable groupée par catégorie plutôt qu'un cycle pas à pas — le
// catalogue est trop large pour ça depuis l'extension PLAN.md §7) puis
// persistée. Type-only import d'AudioEngine (érasé à la compilation) : le
// catalogue reste des données pures, testable sans monter le composant ni
// instancier de contexte audio.
import type { AudioEngine } from '../../engine/AudioEngine';
import type { DrumRowName, SynthRowName } from '../../model/types';

/* Le catalogue d'ACTIONS — révisé le 2026-09-02 (docs/plan/05-audit-mode-live).
 *
 * LE PRINCIPE QUI MANQUAIT : un bouton du Mode Live est un GESTE DE SCÈNE,
 * quelque chose qu'on fait PENDANT qu'on joue, d'un pouce, sans regarder. Ce
 * qu'on fait AVANT de jouer — choisir un preset de voix de synthé — est de la
 * préparation, et sa place est dans l'Atelier. L'ancien catalogue mélangeait
 * les deux, et c'est ce qui faisait « des boutons pas très utiles » : six
 * entrées faisaient défiler des presets de voix, ce qu'on ne fait jamais en
 * plein morceau.
 *
 * ⚠️ Le principe ne vaut QUE pour les boutons, pas pour les axes. Un réglage
 * de voix est de la préparation quand il saute d'un cran, et du jeu quand il
 * balaie en continu — un balayage de cutoff sur la basse EST un geste de
 * scène. C'est pour ça que les deux catalogues restent séparés et que
 * `LIVE_AXES` n'a pas bougé.
 *
 * Ce qui est parti, et où : les six MUTE sont dans le séquenceur (on coupe une
 * ligne là où on la voit) ; les six pas de voix sont de la préparation ; les
 * neuf rafales ont fusionné avec les frappes (voir `kind: 'ligne'`).
 *
 * Mesuré : 31 entrées dont 19 variantes (61 %) -> 18 entrées dont 2 (11 %),
 * et le nombre de gestes réellement distincts MONTE.
 */
export type LiveActionId =
  | 'break'
  | 'fill'
  | 'chaos'
  | 'ligne-kick'
  | 'ligne-snare'
  | 'ligne-hat'
  | 'ligne-clap'
  | 'ligne-shaker'
  | 'mute-drums'
  | 'mute-synth'
  | 'step-transpose-up'
  | 'step-transpose-down'
  | 'step-scale-next'
  | 'step-scale-prev'
  | 'step-pad-mode'
  | 'bypass-limiters'
  | 'petit-hp'
  | 'solo-melody';

export interface LiveActionDef {
  id: LiveActionId;
  label: string;
  color: string;
  desc: string;
  /* trigger : un coup au pointerdown · toggle : bascule au pointerdown ·
     hold : actif tant que maintenu · step : avance un paramètre discret d'un
     cran · ligne : TAP = un coup à la main, MAINTENU = la rafale (voir
     LIGNE_DE, et LiveView.onSlotDown pour l'escalade ×2 -> ×3 -> ×4). */
  kind: 'trigger' | 'toggle' | 'hold' | 'step' | 'ligne';
  category: string;
  /* Retiré du tirage 🎲 sans être retiré du catalogue : les entrées MIROIR
     (TON −1, GAMME ←) servent quand on les assigne à la main, mais les tirer
     au hasard revenait à poser deux fois le même bouton. Le tirage
     uniforme d'avant posait deux rafales côte à côte 56 % du temps. */
  tirable?: boolean;
  // Uniquement pour kind:'step' — l'entrée porte directement son geste.
  step?: (engine: AudioEngine) => void;
  // Uniquement pour kind:'ligne' — quelle ligne de batterie on frappe.
  ligne?: DrumRowName;
}

export const LIVE_ACTIONS: LiveActionDef[] = [
  { id: 'break', label: 'BREAK', color: 'var(--cell-kick)', desc: 'Break (déclencheur)', kind: 'trigger', category: 'SCÈNE' },
  { id: 'fill', label: 'FILL', color: 'var(--cell-snare)', desc: 'Fill forcé (déclencheur)', kind: 'trigger', category: 'SCÈNE' },
  // Un paramètre du catalogue d'axes tiré au hasard, valeur aléatoire, à
  // chaque appui — pas de nouveau bouton dédié, juste une entrée du même
  // catalogue assignable comme les autres.
  { id: 'chaos', label: 'CHAOS', color: '#ffb020', desc: 'Chaos — 1 paramètre au hasard', kind: 'trigger', category: 'SCÈNE' },

  /* FRAPPER une ligne — le manque le plus criant du mode, mis au jour en
   * triant le catalogue : un mode conçu pour jouer sur scène où aucun bouton
   * ne jouait une note de batterie. `AudioEngine.preview()` savait pourtant
   * déjà le faire (c'est ce que l'Atelier appelle au clic sur une case).
   *
   * Et la rafale n'est pas une entrée de plus : une ligne n'a pas besoin de
   * deux boutons. Tap = un coup, maintenu = la rafale qui monte ×2 -> ×3 ->
   * ×4. Cinq entrées couvrent ce qui en demandait quatorze. */
  { id: 'ligne-kick', label: 'KICK', color: 'var(--cell-kick)', desc: 'Frappe · maintenu = rafale', kind: 'ligne', category: 'LIGNES', ligne: 'kick' },
  { id: 'ligne-snare', label: 'CAISSE', color: 'var(--cell-snare)', desc: 'Frappe · maintenu = rafale', kind: 'ligne', category: 'LIGNES', ligne: 'snare' },
  { id: 'ligne-hat', label: 'CHARLEY', color: 'var(--cell-hat)', desc: 'Frappe · maintenu = rafale', kind: 'ligne', category: 'LIGNES', ligne: 'hat' },
  // Clap et shaker n'ont pas de rafale dans l'ordonnanceur : le tap frappe,
  // le maintien ne fait rien de plus. Les exclure aurait été pire — ce sont
  // deux lignes qui sonnent et qu'aucun bouton n'atteignait.
  { id: 'ligne-clap', label: 'CLAP', color: 'var(--cell-clap)', desc: 'Frappe à la main', kind: 'ligne', category: 'LIGNES', ligne: 'clap' },
  { id: 'ligne-shaker', label: 'SHAKER', color: 'var(--cell-shaker)', desc: 'Frappe à la main', kind: 'ligne', category: 'LIGNES', ligne: 'shaker' },

  /* Le geste du DROP. Le séquenceur coupe ligne par ligne ; couper tout un
     groupe d'un coup n'y est pas faisable en un tap, et c'est le geste le
     plus courant d'un set. */
  { id: 'mute-drums', label: 'COUPER BATT.', color: 'var(--cell-kick)', desc: 'Couper toute la batterie (bascule)', kind: 'toggle', category: 'COUPURES' },
  { id: 'mute-synth', label: 'COUPER SYNTHÉ', color: 'var(--cell-bass)', desc: 'Couper tout le synthé (bascule)', kind: 'toggle', category: 'COUPURES' },

  /* HARMONIE — globale, les trois lignes de synthé à la fois. La décliner par
     ligne ferait douze entrées pour une question que personne ne se pose en
     jouant. ±1 demi-ton, borné à ±1 octave. */
  { id: 'step-transpose-up', label: 'TON +1', color: '#ffb020', desc: 'Transpose +1 demi-ton (tout le synthé)', kind: 'step', category: 'HARMONIE', step: (e) => e.liveStepTranspose(1) },
  { id: 'step-transpose-down', label: 'TON −1', color: '#ffb020', desc: 'Transpose −1 demi-ton (tout le synthé)', kind: 'step', category: 'HARMONIE', tirable: false, step: (e) => e.liveStepTranspose(-1) },
  { id: 'step-scale-next', label: 'GAMME →', color: '#ffb020', desc: 'Mode suivant (tout le synthé)', kind: 'step', category: 'HARMONIE', step: (e) => e.liveStepScale(1) },
  { id: 'step-scale-prev', label: 'GAMME ←', color: '#ffb020', desc: 'Mode précédent (tout le synthé)', kind: 'step', category: 'HARMONIE', tirable: false, step: (e) => e.liveStepScale(-1) },

  /* UN bouton, trois états — et ce n'est pas un raffinement : le bourdon
     court-circuite l'arpège dans le scheduler, donc deux interrupteurs
     donneraient un bouton ARPÈGE inerte tant que le bourdon est actif. */
  { id: 'step-pad-mode', label: 'MODE NAPPE', color: 'var(--cell-pad)', desc: 'Normal → arpège → bourdon (pas)', kind: 'step', category: 'NAPPE', step: (e) => e.liveStepPadMode() },

  { id: 'bypass-limiters', label: 'BYPASS LIM.', color: '#ff5a5a', desc: 'Bypass limiteurs (bascule)', kind: 'toggle', category: 'MIX' },
  // Le petit haut-parleur de l'acte 4 : il existait dans le moteur et n'avait
  // jamais été exposé au Live, où il est un outil d'écoute évident.
  { id: 'petit-hp', label: 'PETIT HP', color: '#8fa1b3', desc: 'Écoute petit haut-parleur (bascule)', kind: 'toggle', category: 'MIX' },

  // Maintenu : le temps de l'appui, le pad joue la mélodie au doigt (glisser =
  // degré de gamme + octave), et la mélodie programmée est coupée pour ne pas
  // se télescoper avec ce qui est joué à la main.
  { id: 'solo-melody', label: 'SOLO MÉLO', color: 'var(--cell-melody)', desc: 'Jouer la mélodie au pad (maintenu)', kind: 'hold', category: 'PERFORMANCE' },
];

// Catalogue d'axes — étendu très largement (PLAN.md §7, demande explicite de
// Yann : « une liste assez longue ») : groove, bus batterie, mix, et la quasi
// totalité des réglages de voix synthé par ligne, plutôt qu'un sous-ensemble
// choisi pour nous. `id` reste une chaîne simple (pas un union littéral géant
// à maintenir à la main) : les entrées par ligne synthé sont générées, et la
// validité est de toute façon vérifiée à l'exécution (AXIS_IDS) — même
// principe que pour la persistance localStorage plus bas.
export type LiveAxisId = string;

export interface LiveAxisDef {
  id: LiveAxisId;
  label: string;
  // Regroupement dans le panneau de sélection (voir AssignPicker côté UI) —
  // pas de catégorie = liste plate (utilisé pour les macros historiques).
  category?: string;
  // Le catalogue sait lui-même quoi faire de la valeur 0..1 (courbe, plage,
  // quel setter d'AudioEngine appeler) — LiveView n'a plus qu'à appeler
  // axisById(id).apply(engine, value01).
  apply: (engine: AudioEngine, value01: number) => void;
}

const linMap = (min: number, max: number, value01: number) => min + (max - min) * value01;
const expMap = (min: number, max: number, value01: number) => min * Math.pow(max / min, value01);

const LINE_LABEL: Record<SynthRowName, string> = { bass: 'BASSE', pad: 'NAPPE', melody: 'MÉLODIE' };
const LINE_SHORT: Record<SynthRowName, string> = { bass: 'BASSE', pad: 'NAPPE', melody: 'MÉLO' };

// 14 réglages par ligne synthé (+ étalement pour la nappe seule) — mêmes
// champs, mêmes plages et mêmes unités que SynthRowView.svelte (Atelier),
// pour que ce que fait le pad corresponde à ce que montrerait le curseur
// équivalent. Cutoff/résonance/enveloppe de filtre en courbe exponentielle
// (plus naturel à l'oreille pour un balayage), le reste en linéaire.
function synthAxesFor(name: SynthRowName): LiveAxisDef[] {
  const category = LINE_LABEL[name];
  const s = LINE_SHORT[name];
  const defs: LiveAxisDef[] = [
    {
      id: `cutoff-${name}`,
      label: `CUTOFF ${s}`,
      category,
      apply: (e, v) => e.setLiveSynthVoiceParam(name, 'cutoff', expMap(100, 4000, v)),
    },
    {
      id: `resonance-${name}`,
      label: `RÉSO ${s}`,
      category,
      apply: (e, v) => e.setLiveSynthVoiceParam(name, 'resonance', expMap(0.3, 12, v)),
    },
    {
      id: `attack-${name}`,
      label: `ATTACK ${s}`,
      category,
      apply: (e, v) => e.setLiveSynthVoiceParam(name, 'attack', linMap(0, 0.2, v)),
    },
    {
      id: `release-${name}`,
      label: `RELEASE ${s}`,
      category,
      apply: (e, v) => e.setLiveSynthVoiceParam(name, 'release', linMap(0, 4, v)),
    },
    {
      id: `subgain-${name}`,
      label: `SUB ${s}`,
      category,
      apply: (e, v) => e.setLiveSynthVoiceParam(name, 'subGain', v),
    },
    {
      id: `detune-${name}`,
      label: `DÉTUNE ${s}`,
      category,
      apply: (e, v) => e.setLiveSynthVoiceParam(name, 'detuneCents', linMap(0, 30, v)),
    },
    {
      id: `detune-mix-${name}`,
      label: `MIX DÉT. ${s}`,
      category,
      apply: (e, v) => e.setLiveSynthVoiceParam(name, 'detuneGain', v),
    },
    {
      id: `chorus-${name}`,
      label: `CHORUS ${s}`,
      category,
      apply: (e, v) => e.setLiveSynthVoiceParam(name, 'chorusMix', v),
    },
    {
      id: `vibrato-${name}`,
      label: `VIBRATO ${s}`,
      category,
      apply: (e, v) => e.setLiveSynthVoiceParam(name, 'vibratoDepth', v),
    },
    {
      id: `vibrato-rate-${name}`,
      label: `VIB. RATE ${s}`,
      category,
      apply: (e, v) => e.setLiveSynthVoiceParam(name, 'vibratoRate', linMap(1, 12, v)),
    },
    {
      id: `tone-${name}`,
      label: `TONE ${s}`,
      category,
      apply: (e, v) => e.setLiveSynthVoiceParam(name, 'tone', linMap(0, 100, v)),
    },
    {
      id: `filter-env-${name}`,
      label: `ENV. FILTRE ${s}`,
      category,
      apply: (e, v) => e.setLiveSynthVoiceParam(name, 'filterEnvAmount', linMap(0, 4000, v)),
    },
    {
      id: `filter-env-release-${name}`,
      label: `FERM. FILTRE ${s}`,
      category,
      apply: (e, v) => e.setLiveSynthVoiceParam(name, 'filterEnvRelease', linMap(0, 4, v)),
    },
    {
      id: `glide-${name}`,
      label: `GLIDE ${s}`,
      category,
      apply: (e, v) => e.setLiveSynthRowParam(name, 'glide', v),
    },
  ];
  if (name === 'pad') {
    defs.push({
      id: 'strum-pad',
      label: 'ÉTALEMENT',
      category,
      apply: (e, v) => e.setLiveSynthRowParam('pad', 'strum', v),
    });
  }
  return defs;
}

export const LIVE_AXES: LiveAxisDef[] = [
  // Macros live historiques (phase 2) — nœuds de graphe dédiés
  // (liveFilter/liveReverbSend, graph.ts), toujours neutres ailleurs.
  { id: 'filter', label: 'FILTRE', apply: (e, v) => e.setLiveFilterCutoff(expMap(200, 20000, v)) },
  { id: 'reverb', label: 'REVERB', apply: (e, v) => e.setLiveReverbWet(v) },

  // Groove — mêmes champs/unités que les curseurs Groove de l'Atelier.
  { id: 'swing', label: 'SWING', category: 'GROOVE', apply: (e, v) => e.setLiveGrooveParam('swing', linMap(0, 75, v)) },
  { id: 'drag', label: 'TRAÎNE', category: 'GROOVE', apply: (e, v) => e.setLiveGrooveParam('drag', linMap(0, 30, v)) },
  {
    id: 'ghost-density',
    label: 'GHOST NOTES',
    category: 'GROOVE',
    apply: (e, v) => e.setLiveGrooveParam('ghostDensity', linMap(0, 40, v)),
  },
  {
    id: 'fill-intensity',
    label: 'INT. FILL',
    category: 'GROOVE',
    apply: (e, v) => e.setLiveGrooveParam('fillIntensity', linMap(0, 100, v)),
  },

  // Bus DRUM uniquement (globalSaturation/globalBitcrush/globalCompression,
  // model/types.ts) — pas le mix entier.
  { id: 'saturation', label: 'SATUR. BATT.', category: 'BUS BATTERIE', apply: (e, v) => e.setLiveSaturation(v) },
  { id: 'bitcrush', label: 'CRUSH BATT.', category: 'BUS BATTERIE', apply: (e, v) => e.setLiveBitcrush(v) },
  { id: 'compression', label: 'COMP. BATT.', category: 'BUS BATTERIE', apply: (e, v) => e.setLiveCompression(v) },

  // Mix global.
  { id: 'volume', label: 'VOLUME', category: 'MIX', apply: (e, v) => e.setLiveVolume(v) },
  { id: 'delay-feedback', label: 'DELAY FB', category: 'MIX', apply: (e, v) => e.setLiveDelayFeedback(v) },
  { id: 'sidechain-depth', label: 'SIDECHAIN', category: 'MIX', apply: (e, v) => e.setLiveSidechainDepth(v) },

  // Voix synthé, une catégorie par ligne.
  ...synthAxesFor('bass'),
  ...synthAxesFor('pad'),
  ...synthAxesFor('melody'),
];

// Regroupe une liste d'entrées de catalogue par catégorie, dans l'ordre
// d'apparition — pour le panneau de sélection (trop d'entrées pour une liste
// plate lisible, aussi bien côté axes que côté actions depuis leur extension
// respective, PLAN.md §7).
function groupByCategory<T extends { category?: string }>(items: T[], fallback: string): { name: string; items: T[] }[] {
  const order: string[] = [];
  const byName = new Map<string, T[]>();
  for (const item of items) {
    const name = item.category ?? fallback;
    if (!byName.has(name)) {
      byName.set(name, []);
      order.push(name);
    }
    byName.get(name)!.push(item);
  }
  return order.map((name) => ({ name, items: byName.get(name)! }));
}

export interface LiveAxisGroup {
  name: string;
  items: LiveAxisDef[];
}

// Les deux macros historiques (filtre/reverb, sans catégorie) forment un
// groupe "MACRO" implicite en tête de liste.
export const AXIS_GROUPS: LiveAxisGroup[] = groupByCategory(LIVE_AXES, 'MACRO');

export interface LiveActionGroup {
  name: string;
  items: LiveActionDef[];
}

export const ACTION_GROUPS: LiveActionGroup[] = groupByCategory(LIVE_ACTIONS, 'AUTRE');

// Les 3 visualiseurs explorés dans la maquette (proposition-Mode-Live) — un
// seul retenu au départ (①, phase 2), les deux autres ajoutés en option ici
// plutôt qu'abandonnés (PLAN.md §7).
export type LiveVizId = 'bars' | 'arty' | 'runner';

export interface LiveVizDef {
  id: LiveVizId;
  label: string;
}

export const LIVE_VIZ: LiveVizDef[] = [
  { id: 'bars', label: 'BARRES' },
  { id: 'arty', label: 'ARTY' },
  { id: 'runner', label: 'RUN' },
];

export const SLOT_COUNT = 6;

// Chaque bouton peut fonctionner en mode ACTIONS (catalogue LIVE_ACTIONS —
// interrupteur/pas/déclencheur/maintenu) ou en mode FADER (catalogue
// LIVE_AXES, comme le pad/l'inclinaison, mais piloté par un glisser vertical
// sur le bouton lui-même — PLAN.md §7, retour de Yann : « j'agence les
// boutons selon 3 types »). Les deux catalogues restent SÉPARÉS par bouton
// plutôt que mélangés dans un seul tableau : les gestes (tap/hold pour les
// actions, glisser continu pour le fader) sont incompatibles sur la même
// surface au même moment.
export type SlotMode = 'actions' | 'fader';

// Orientation du glisser en mode FADER (PLAN.md §7, retour de Yann : « un
// type de bouton où c'est un fader gauche-droite au sein du bouton, où
// haut-bas, à voir le plus simple ») — un champ par bouton, à côté de
// slotModes, ignoré tant que le bouton n'est pas en mode fader (même
// convention que slotFaders).
export type FaderOrientation = 'vertical' | 'horizontal';

// Chaque bouton/axe peut désormais porter PLUSIEURS entrées du catalogue à la
// fois (PLAN.md §7, retour de Yann : « on peut assigner plusieurs paramètres
// à un même contrôleur ») — un bouton peut déclencher plusieurs actions d'un
// coup, un axe peut piloter plusieurs paramètres ensemble (macro). Toujours
// au moins une entrée par slot/axe : jamais de tableau vide, sinon le
// panneau de sélection perdrait toute trace de ce qui est assigné.
export interface LiveAssignments {
  /* Il n'y a plus de verrou, ni par bouton ni pour le pad — et plus de
     brassage total non plus (arbitrage de Yann, 2026-08-19).
     Le raisonnement, dans cet ordre : le dé PAR bouton rend le brassage total
     inutile, or le verrou n'existait QUE pour protéger du brassage total ;
     sans lui, il ne protège de rien. Restent des dés, un par chose
     assignable — les six boutons, le pad, l'inclinaison.
     Les assignations déjà enregistrées qui portent encore `slotLocked` et
     `padLocked` se rechargent sans broncher : le validateur ne les réclame
     plus, et les clés en trop sont simplement ignorées. */
  slots: LiveActionId[][]; // longueur SLOT_COUNT, chaque slot = 1+ actions
  slotModes: SlotMode[]; // longueur SLOT_COUNT — ignoré (mode 'actions') si le bouton n'a jamais été basculé en fader
  slotFaders: LiveAxisId[][]; // longueur SLOT_COUNT, 1+ axes — utilisé seulement si slotModes[i] === 'fader'
  faderOrientation: FaderOrientation[]; // longueur SLOT_COUNT — utilisé seulement si slotModes[i] === 'fader'
  axisX: LiveAxisId[];
  axisY: LiveAxisId[];
  // Inclinaison (phase 4) : optionnelle, jamais requise — n'agit sur rien
  // tant que le bouton TILT n'est pas activé côté capteur.
  axisTilt: LiveAxisId[];
  viz: LiveVizId;
}

/* Le défaut par rang de bouton — exporté parce que la migration s'en sert pour
   remplir un slot vidé par un déménagement, et que le test le vérifie. */
export const DEFAUTS_SLOTS: LiveActionId[][] = [
  ['break'],
  ['fill'],
  ['ligne-kick'],
  ['ligne-snare'],
  ['ligne-hat'],
  ['chaos'],
];

const DEFAULT_ASSIGNMENTS: LiveAssignments = {
  slots: DEFAUTS_SLOTS.map((s) => [...s]),
  slotModes: ['actions', 'actions', 'actions', 'actions', 'actions', 'actions'],
  slotFaders: [['filter'], ['reverb'], ['filter'], ['reverb'], ['filter'], ['reverb']],
  faderOrientation: ['vertical', 'vertical', 'vertical', 'vertical', 'vertical', 'vertical'],
  axisX: ['filter'],
  axisY: ['reverb'],
  axisTilt: ['filter'],
  viz: 'bars',
};

const KEY = 'boite-a-rythme:mode-live-assign';
const ACTION_IDS = new Set(LIVE_ACTIONS.map((a) => a.id));

/* Les entrées que le 🎲 a le droit de tirer — voir `tirable`. */
export const ACTIONS_TIRABLES: LiveActionDef[] = LIVE_ACTIONS.filter((a) => a.tirable !== false);

/* ⚠️ MIGRATION — à appliquer AVANT la validation, jamais après.
 *
 * `isValid` est TOUT OU RIEN : une assignation enregistrée qui cite un
 * identifiant disparu la fait échouer en bloc, et `loadLiveAssignments` rend
 * alors les défauts — les six boutons ET les trois snapshots perdus d'un coup,
 * sans un mot. C'est le piège qu'on ne découvre qu'en production, sur la
 * configuration de quelqu'un d'autre.
 *
 * Les rafales ×2/×3/×4 deviennent l'entrée fusionnée de leur ligne ; les mutes
 * par ligne et les pas de preset de voix ont changé de domicile (séquenceur,
 * Atelier) et sont simplement retirés du slot. Un slot vidé par ces retraits
 * reprend le défaut de son rang plutôt que de rester vide.
 */
const CORRESPONDANCES: Record<string, LiveActionId | null> = {
  'roll-kick-x2': 'ligne-kick',
  'roll-kick-x3': 'ligne-kick',
  'roll-kick-x4': 'ligne-kick',
  'roll-snare-x2': 'ligne-snare',
  'roll-snare-x3': 'ligne-snare',
  'roll-snare-x4': 'ligne-snare',
  'roll-hat-x2': 'ligne-hat',
  'roll-hat-x3': 'ligne-hat',
  'roll-hat-x4': 'ligne-hat',
  // Déménagés dans le séquenceur : on coupe une ligne là où on la voit.
  'mute-kick': null,
  'mute-snare': null,
  'mute-hat': null,
  'mute-bass': null,
  'mute-pad': null,
  'mute-melody': null,
  // De la préparation, pas un geste de scène.
  'step-voice-bass-next': null,
  'step-voice-bass-prev': null,
  'step-voice-pad-next': null,
  'step-voice-pad-prev': null,
  'step-voice-melody-next': null,
  'step-voice-melody-prev': null,
  // L'arpège devient un état du bouton MODE NAPPE.
  'toggle-pad-arp': 'step-pad-mode',
};

function migrerListeActions(v: unknown, defaut: LiveActionId[]): LiveActionId[] {
  if (!Array.isArray(v)) return defaut;
  const sortie: LiveActionId[] = [];
  for (const brut of v) {
    if (typeof brut !== 'string') continue;
    const id = brut in CORRESPONDANCES ? CORRESPONDANCES[brut] : (brut as LiveActionId);
    if (id && ACTION_IDS.has(id) && !sortie.includes(id)) sortie.push(id);
  }
  return sortie.length ? sortie : defaut;
}

/** Réécrit une assignation enregistrée dans le vocabulaire courant. */
function migrer(v: unknown): unknown {
  if (!v || typeof v !== 'object') return v;
  const a = v as { slots?: unknown };
  if (!Array.isArray(a.slots)) return v;
  const defauts = DEFAUTS_SLOTS;
  return {
    ...a,
    slots: a.slots.map((slot, i) => migrerListeActions(slot, defauts[i] ?? defauts[0])),
  };
}
const AXIS_IDS = new Set(LIVE_AXES.map((a) => a.id));
const VIZ_IDS = new Set(LIVE_VIZ.map((v) => v.id));
const SLOT_MODES: SlotMode[] = ['actions', 'fader'];
const FADER_ORIENTATIONS: FaderOrientation[] = ['vertical', 'horizontal'];

function isValidAxisList(v: unknown): v is LiveAxisId[] {
  return Array.isArray(v) && v.length > 0 && v.every((id) => AXIS_IDS.has(id));
}

function isValid(v: unknown): v is LiveAssignments {
  if (!v || typeof v !== 'object') return false;
  const a = v as Partial<LiveAssignments>;
  return (
    Array.isArray(a.slots) &&
    a.slots.length === SLOT_COUNT &&
    a.slots.every((s) => Array.isArray(s) && s.length > 0 && s.every((id) => ACTION_IDS.has(id as LiveActionId))) &&
    Array.isArray(a.slotModes) &&
    a.slotModes.length === SLOT_COUNT &&
    a.slotModes.every((m) => SLOT_MODES.includes(m as SlotMode)) &&
    Array.isArray(a.slotFaders) &&
    a.slotFaders.length === SLOT_COUNT &&
    a.slotFaders.every((f) => isValidAxisList(f)) &&
    Array.isArray(a.faderOrientation) &&
    a.faderOrientation.length === SLOT_COUNT &&
    a.faderOrientation.every((o) => FADER_ORIENTATIONS.includes(o as FaderOrientation)) &&
    isValidAxisList(a.axisX) &&
    isValidAxisList(a.axisY) &&
    isValidAxisList(a.axisTilt) &&
    !!a.viz &&
    VIZ_IDS.has(a.viz)
  );
}

// Chaque slot/axe contient désormais des tableaux (référence, pas valeur) —
// un simple spread ne suffit plus à isoler une copie de DEFAULT_ASSIGNMENTS,
// muter assignments.slots[0] muterait le tableau par défaut partagé.
function freshDefaults(): LiveAssignments {
  return structuredClone(DEFAULT_ASSIGNMENTS);
}

export function loadLiveAssignments(): LiveAssignments {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshDefaults();
    const parsed = migrer(JSON.parse(raw));
    return isValid(parsed) ? parsed : freshDefaults();
  } catch {
    return freshDefaults();
  }
}

export function saveLiveAssignments(a: LiveAssignments): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    /* quota plein ou stockage refusé : l'assignation reste active pour la session, sans persister */
  }
}

// Snapshots d'assignation (PLAN.md §7, réserve : « snapshot des assignations
// rappelable par appui long ») — 3 emplacements fixes (A/B/C), même principe
// borné que SLOT_COUNT/SNAPSHOT_COUNT plutôt qu'une liste ouverte à gérer.
// Un appui court sur un emplacement SAUVEGARDE l'assignation courante dedans
// (geste anodin, jamais destructeur) ; un appui long la RAPPELLE (geste
// délibéré — écrase toute l'assignation courante en plein set, donc protégé
// comme le reste des gestes à risque de mistap déjà identifiés, PLAN.md §7 :
// bouton ⚙ éloigné du pad, toggle inclinaison sorti de la zone de drag).
export const SNAPSHOT_COUNT = 3;
const SNAPSHOT_KEY = 'boite-a-rythme:mode-live-snapshots';

export function loadLiveSnapshots(): (LiveAssignments | null)[] {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return Array(SNAPSHOT_COUNT).fill(null);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== SNAPSHOT_COUNT) return Array(SNAPSHOT_COUNT).fill(null);
    return parsed.map((p) => {
      const m = migrer(p);
      return isValid(m) ? m : null;
    });
  } catch {
    return Array(SNAPSHOT_COUNT).fill(null);
  }
}

export function saveLiveSnapshots(snapshots: (LiveAssignments | null)[]): void {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots));
  } catch {
    /* quota plein ou stockage refusé : les snapshots restent actifs pour la session, sans persister */
  }
}

export function actionById(id: LiveActionId): LiveActionDef {
  return LIVE_ACTIONS.find((a) => a.id === id)!;
}

export function axisById(id: LiveAxisId): LiveAxisDef {
  return LIVE_AXES.find((a) => a.id === id)!;
}

// Helpers pluriels — un slot/axe porte désormais 1+ entrées du catalogue.
export function actionsFor(ids: LiveActionId[]): LiveActionDef[] {
  return ids.map((id) => actionById(id));
}

export function axesFor(ids: LiveAxisId[]): LiveAxisDef[] {
  return ids.map((id) => axisById(id));
}

export function vizById(id: LiveVizId): LiveVizDef {
  return LIVE_VIZ.find((v) => v.id === id)!;
}
