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
  | 'mute-kick'
  | 'mute-snare'
  | 'mute-hat'
  | 'roll-hat-x2'
  | 'roll-hat-x3'
  | 'roll-hat-x4'
  | 'chaos';

export interface LiveActionDef {
  id: LiveActionId;
  label: string;
  color: string;
  desc: string;
  // trigger : un coup au pointerdown (break/fill) ; toggle : bascule au
  // pointerdown (mute) ; hold : actif tant que maintenu (roll).
  kind: 'trigger' | 'toggle' | 'hold';
}

export const LIVE_ACTIONS: LiveActionDef[] = [
  { id: 'break', label: 'BREAK', color: 'var(--cell-kick)', desc: 'Break (déclencheur)', kind: 'trigger' },
  { id: 'fill', label: 'FILL', color: 'var(--cell-snare)', desc: 'Fill forcé (déclencheur)', kind: 'trigger' },
  { id: 'mute-kick', label: 'MUTE K', color: 'var(--cell-kick)', desc: 'Muet — Kick', kind: 'toggle' },
  { id: 'mute-snare', label: 'MUTE S', color: 'var(--cell-snare)', desc: 'Muet — Snare', kind: 'toggle' },
  { id: 'mute-hat', label: 'MUTE H', color: 'var(--cell-hat)', desc: 'Muet — Hat', kind: 'toggle' },
  { id: 'roll-hat-x2', label: 'ROLL×2', color: 'var(--cell-hat)', desc: 'Rafale hat ×2 (maintenu)', kind: 'hold' },
  { id: 'roll-hat-x3', label: 'ROLL×3', color: 'var(--cell-hat)', desc: 'Rafale hat ×3 (maintenu)', kind: 'hold' },
  { id: 'roll-hat-x4', label: 'ROLL×4', color: 'var(--cell-hat)', desc: 'Rafale hat ×4 (maintenu)', kind: 'hold' },
  // Un paramètre du catalogue d'axes tiré au hasard, valeur aléatoire, à
  // chaque appui — pas de nouveau bouton dédié, juste une entrée du même
  // catalogue assignable comme les autres (PLAN.md §7, piste "chaos" vs
  // "brasser" : chaos ici, brasser est le bouton 🔀 séparé de LiveView).
  { id: 'chaos', label: 'CHAOS', color: '#ffb020', desc: 'Chaos — 1 paramètre au hasard', kind: 'trigger' },
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

// LIVE_AXES groupé par catégorie, dans l'ordre d'apparition — pour le
// panneau de sélection (trop d'entrées pour une liste plate lisible). Les
// deux macros historiques (filtre/reverb, sans catégorie) forment un groupe
// "MACRO" implicite en tête de liste.
export interface LiveAxisGroup {
  name: string;
  items: LiveAxisDef[];
}

export const AXIS_GROUPS: LiveAxisGroup[] = (() => {
  const order: string[] = [];
  const byName = new Map<string, LiveAxisDef[]>();
  for (const axis of LIVE_AXES) {
    const name = axis.category ?? 'MACRO';
    if (!byName.has(name)) {
      byName.set(name, []);
      order.push(name);
    }
    byName.get(name)!.push(axis);
  }
  return order.map((name) => ({ name, items: byName.get(name)! }));
})();

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

export interface LiveAssignments {
  slots: LiveActionId[]; // longueur SLOT_COUNT
  axisX: LiveAxisId;
  axisY: LiveAxisId;
  // Inclinaison (phase 4) : optionnelle, jamais requise — n'agit sur rien
  // tant que le bouton TILT n'est pas activé côté capteur.
  axisTilt: LiveAxisId;
  viz: LiveVizId;
}

const DEFAULT_ASSIGNMENTS: LiveAssignments = {
  slots: ['break', 'fill', 'mute-kick', 'mute-snare', 'mute-hat', 'roll-hat-x2'],
  axisX: 'filter',
  axisY: 'reverb',
  axisTilt: 'filter',
  viz: 'bars',
};

const KEY = 'boite-a-rythme:mode-live-assign';
const ACTION_IDS = new Set(LIVE_ACTIONS.map((a) => a.id));
const AXIS_IDS = new Set(LIVE_AXES.map((a) => a.id));
const VIZ_IDS = new Set(LIVE_VIZ.map((v) => v.id));

function isValid(v: unknown): v is LiveAssignments {
  if (!v || typeof v !== 'object') return false;
  const a = v as Partial<LiveAssignments>;
  return (
    Array.isArray(a.slots) &&
    a.slots.length === SLOT_COUNT &&
    a.slots.every((id) => ACTION_IDS.has(id as LiveActionId)) &&
    !!a.axisX &&
    AXIS_IDS.has(a.axisX) &&
    !!a.axisY &&
    AXIS_IDS.has(a.axisY) &&
    !!a.axisTilt &&
    AXIS_IDS.has(a.axisTilt) &&
    !!a.viz &&
    VIZ_IDS.has(a.viz)
  );
}

export function loadLiveAssignments(): LiveAssignments {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_ASSIGNMENTS, slots: [...DEFAULT_ASSIGNMENTS.slots] };
    const parsed = JSON.parse(raw);
    return isValid(parsed) ? parsed : { ...DEFAULT_ASSIGNMENTS, slots: [...DEFAULT_ASSIGNMENTS.slots] };
  } catch {
    return { ...DEFAULT_ASSIGNMENTS, slots: [...DEFAULT_ASSIGNMENTS.slots] };
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

export function vizById(id: LiveVizId): LiveVizDef {
  return LIVE_VIZ.find((v) => v.id === id)!;
}
