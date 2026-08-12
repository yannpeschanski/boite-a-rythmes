// Catalogue des actions/axes assignables du Mode Live (phase 3, PLAN.md §7)
// — un bouton/axe ne code plus en dur "ce qu'il fait", il pointe vers une de
// ces définitions, et l'association est modifiable depuis l'overlay ⚙ (liste
// scrollable groupée par catégorie plutôt qu'un cycle pas à pas — le
// catalogue est trop large pour ça depuis l'extension PLAN.md §7) puis
// persistée. Type-only import d'AudioEngine (érasé à la compilation) : le
// catalogue reste des données pures, testable sans monter le composant ni
// instancier de contexte audio.
import type { AudioEngine } from '../../engine/AudioEngine';
import type { SynthRowName } from '../../model/types';

export type LiveActionId =
  | 'break'
  | 'fill'
  | 'chaos'
  | 'mute-kick'
  | 'mute-snare'
  | 'mute-hat'
  | 'mute-bass'
  | 'mute-pad'
  | 'mute-melody'
  | 'roll-kick-x2'
  | 'roll-kick-x3'
  | 'roll-kick-x4'
  | 'roll-snare-x2'
  | 'roll-snare-x3'
  | 'roll-snare-x4'
  | 'roll-hat-x2'
  | 'roll-hat-x3'
  | 'roll-hat-x4'
  | 'bypass-limiters';

export interface LiveActionDef {
  id: LiveActionId;
  label: string;
  color: string;
  desc: string;
  // trigger : un coup au pointerdown (break/fill) ; toggle : bascule au
  // pointerdown (mute) ; hold : actif tant que maintenu (roll).
  kind: 'trigger' | 'toggle' | 'hold';
  // Regroupement dans le panneau de sélection (voir ACTION_GROUPS) — 19
  // entrées ne se lisent plus comme une liste plate (PLAN.md §7, retour de
  // Yann : catalogue de boutons trop court, même traitement que les axes).
  category: string;
}

export const LIVE_ACTIONS: LiveActionDef[] = [
  { id: 'break', label: 'BREAK', color: 'var(--cell-kick)', desc: 'Break (déclencheur)', kind: 'trigger', category: 'TRANSPORT' },
  { id: 'fill', label: 'FILL', color: 'var(--cell-snare)', desc: 'Fill forcé (déclencheur)', kind: 'trigger', category: 'TRANSPORT' },
  // Un paramètre du catalogue d'axes tiré au hasard, valeur aléatoire, à
  // chaque appui — pas de nouveau bouton dédié, juste une entrée du même
  // catalogue assignable comme les autres (PLAN.md §7, piste "chaos" vs
  // "brasser" : chaos ici, brasser est le bouton 🔀 séparé de LiveView).
  { id: 'chaos', label: 'CHAOS', color: '#ffb020', desc: 'Chaos — 1 paramètre au hasard', kind: 'trigger', category: 'TRANSPORT' },

  { id: 'mute-kick', label: 'MUTE K', color: 'var(--cell-kick)', desc: 'Muet — Kick', kind: 'toggle', category: 'MUTES BATTERIE' },
  { id: 'mute-snare', label: 'MUTE S', color: 'var(--cell-snare)', desc: 'Muet — Snare', kind: 'toggle', category: 'MUTES BATTERIE' },
  { id: 'mute-hat', label: 'MUTE H', color: 'var(--cell-hat)', desc: 'Muet — Hat', kind: 'toggle', category: 'MUTES BATTERIE' },

  // Même garde-fou que les mutes batterie : le bouton ne fait qu'AJOUTER un
  // mute par-dessus le pattern, jamais retirer un mute posé dans l'Atelier
  // (AudioEngine.liveSetSynthMute).
  { id: 'mute-bass', label: 'MUTE BASSE', color: 'var(--cell-bass)', desc: 'Muet — Basse', kind: 'toggle', category: 'MUTES SYNTHÉ' },
  { id: 'mute-pad', label: 'MUTE NAPPE', color: 'var(--cell-pad)', desc: 'Muet — Nappe', kind: 'toggle', category: 'MUTES SYNTHÉ' },
  { id: 'mute-melody', label: 'MUTE MÉLO', color: 'var(--cell-melody)', desc: 'Muet — Mélodie', kind: 'toggle', category: 'MUTES SYNTHÉ' },

  { id: 'roll-kick-x2', label: 'ROLL K×2', color: 'var(--cell-kick)', desc: 'Rafale kick ×2 (maintenu)', kind: 'hold', category: 'ROLL KICK' },
  { id: 'roll-kick-x3', label: 'ROLL K×3', color: 'var(--cell-kick)', desc: 'Rafale kick ×3 (maintenu)', kind: 'hold', category: 'ROLL KICK' },
  { id: 'roll-kick-x4', label: 'ROLL K×4', color: 'var(--cell-kick)', desc: 'Rafale kick ×4 (maintenu)', kind: 'hold', category: 'ROLL KICK' },

  { id: 'roll-snare-x2', label: 'ROLL S×2', color: 'var(--cell-snare)', desc: 'Rafale snare ×2 (maintenu)', kind: 'hold', category: 'ROLL SNARE' },
  { id: 'roll-snare-x3', label: 'ROLL S×3', color: 'var(--cell-snare)', desc: 'Rafale snare ×3 (maintenu)', kind: 'hold', category: 'ROLL SNARE' },
  { id: 'roll-snare-x4', label: 'ROLL S×4', color: 'var(--cell-snare)', desc: 'Rafale snare ×4 (maintenu)', kind: 'hold', category: 'ROLL SNARE' },

  { id: 'roll-hat-x2', label: 'ROLL H×2', color: 'var(--cell-hat)', desc: 'Rafale hat ×2 (maintenu)', kind: 'hold', category: 'ROLL HAT' },
  { id: 'roll-hat-x3', label: 'ROLL H×3', color: 'var(--cell-hat)', desc: 'Rafale hat ×3 (maintenu)', kind: 'hold', category: 'ROLL HAT' },
  { id: 'roll-hat-x4', label: 'ROLL H×4', color: 'var(--cell-hat)', desc: 'Rafale hat ×4 (maintenu)', kind: 'hold', category: 'ROLL HAT' },

  // Coupe le limiteur de sécurité final le temps d'un geste — même valeurs
  // enabled/disabled que le réglage de l'Atelier (graph.ts, buildGraph).
  { id: 'bypass-limiters', label: 'BYPASS LIM.', color: '#ff5a5a', desc: 'Bypass limiteurs (bascule)', kind: 'toggle', category: 'MIX' },
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

// Chaque bouton/axe peut désormais porter PLUSIEURS entrées du catalogue à la
// fois (PLAN.md §7, retour de Yann : « on peut assigner plusieurs paramètres
// à un même contrôleur ») — un bouton peut déclencher plusieurs actions d'un
// coup, un axe peut piloter plusieurs paramètres ensemble (macro). Toujours
// au moins une entrée par slot/axe : jamais de tableau vide, sinon le
// panneau de sélection perdrait toute trace de ce qui est assigné.
export interface LiveAssignments {
  slots: LiveActionId[][]; // longueur SLOT_COUNT, chaque slot = 1+ actions
  axisX: LiveAxisId[];
  axisY: LiveAxisId[];
  // Inclinaison (phase 4) : optionnelle, jamais requise — n'agit sur rien
  // tant que le bouton TILT n'est pas activé côté capteur.
  axisTilt: LiveAxisId[];
  viz: LiveVizId;
}

const DEFAULT_ASSIGNMENTS: LiveAssignments = {
  slots: [['break'], ['fill'], ['mute-kick'], ['mute-snare'], ['mute-hat'], ['roll-hat-x2']],
  axisX: ['filter'],
  axisY: ['reverb'],
  axisTilt: ['filter'],
  viz: 'bars',
};

const KEY = 'boite-a-rythme:mode-live-assign';
const ACTION_IDS = new Set(LIVE_ACTIONS.map((a) => a.id));
const AXIS_IDS = new Set(LIVE_AXES.map((a) => a.id));
const VIZ_IDS = new Set(LIVE_VIZ.map((v) => v.id));

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
    const parsed = JSON.parse(raw);
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
