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
  | 'roll-hat-x4';

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
];

export type LiveAxisId = 'filter' | 'reverb';

export interface LiveAxisDef {
  id: LiveAxisId;
  label: string;
}

export const LIVE_AXES: LiveAxisDef[] = [
  { id: 'filter', label: 'FILTRE' },
  { id: 'reverb', label: 'REVERB' },
];

export const SLOT_COUNT = 6;

export interface LiveAssignments {
  slots: LiveActionId[]; // longueur SLOT_COUNT
  axisX: LiveAxisId;
  axisY: LiveAxisId;
}

const DEFAULT_ASSIGNMENTS: LiveAssignments = {
  slots: ['break', 'fill', 'mute-kick', 'mute-snare', 'mute-hat', 'roll-hat-x2'],
  axisX: 'filter',
  axisY: 'reverb',
};

const KEY = 'boite-a-rythme:mode-live-assign';
const ACTION_IDS = new Set(LIVE_ACTIONS.map((a) => a.id));
const AXIS_IDS = new Set(LIVE_AXES.map((a) => a.id));

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
    AXIS_IDS.has(a.axisY)
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

export function cycleAction(current: LiveActionId): LiveActionId {
  const idx = LIVE_ACTIONS.findIndex((a) => a.id === current);
  return LIVE_ACTIONS[(idx + 1) % LIVE_ACTIONS.length].id;
}

export function cycleAxis(current: LiveAxisId): LiveAxisId {
  const idx = LIVE_AXES.findIndex((a) => a.id === current);
  return LIVE_AXES[(idx + 1) % LIVE_AXES.length].id;
}
