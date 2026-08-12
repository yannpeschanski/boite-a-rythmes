// Catalogue des actions assignables du Mode Live (phase 3, PLAN.md §7) — un
// bouton/axe ne code plus en dur "ce qu'il fait", il pointe vers une de ces
// définitions, et l'association est modifiable depuis l'overlay ⚙ puis
// persistée. Séparé de LiveView.svelte pour que le catalogue et sa
// validation restent testables sans monter le composant.

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

export type LiveAxisId =
  | 'filter'
  | 'reverb'
  | 'saturation'
  | 'bitcrush'
  | 'compression'
  | 'volume'
  | 'delay-feedback'
  | 'sidechain-depth'
  | 'cutoff-bass'
  | 'cutoff-pad'
  | 'cutoff-melody'
  | 'resonance-bass'
  | 'resonance-pad'
  | 'resonance-melody';

export interface LiveAxisDef {
  id: LiveAxisId;
  label: string;
}

// Les 2 premiers existaient depuis la phase 2 ; les 12 suivants étendent le
// catalogue (PLAN.md §7) — saturation/bitcrush/compression sont des effets du
// bus DRUM uniquement (voir globalSaturation/globalBitcrush/globalCompression,
// model/types.ts), pas du mix entier.
export const LIVE_AXES: LiveAxisDef[] = [
  { id: 'filter', label: 'FILTRE' },
  { id: 'reverb', label: 'REVERB' },
  { id: 'saturation', label: 'SAT. BATT.' },
  { id: 'bitcrush', label: 'CRUSH BATT.' },
  { id: 'compression', label: 'COMP. BATT.' },
  { id: 'volume', label: 'VOLUME' },
  { id: 'delay-feedback', label: 'DELAY FB' },
  { id: 'sidechain-depth', label: 'SIDECHAIN' },
  { id: 'cutoff-bass', label: 'CUT. BASSE' },
  { id: 'cutoff-pad', label: 'CUT. NAPPE' },
  { id: 'cutoff-melody', label: 'CUT. MÉLO' },
  { id: 'resonance-bass', label: 'RÉSO BASSE' },
  { id: 'resonance-pad', label: 'RÉSO NAPPE' },
  { id: 'resonance-melody', label: 'RÉSO MÉLO' },
];

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

export function cycleAction(current: LiveActionId): LiveActionId {
  const idx = LIVE_ACTIONS.findIndex((a) => a.id === current);
  return LIVE_ACTIONS[(idx + 1) % LIVE_ACTIONS.length].id;
}

export function cycleAxis(current: LiveAxisId): LiveAxisId {
  const idx = LIVE_AXES.findIndex((a) => a.id === current);
  return LIVE_AXES[(idx + 1) % LIVE_AXES.length].id;
}

export function cycleViz(current: LiveVizId): LiveVizId {
  const idx = LIVE_VIZ.findIndex((v) => v.id === current);
  return LIVE_VIZ[(idx + 1) % LIVE_VIZ.length].id;
}
