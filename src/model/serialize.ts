// Sérialisation du format v2 + import tolérant (rétrocompat v1 : drum seul,
// snare booléen -> 0/1/2) — port de exportState/importState (l. 6338–6575).
import {
  MAXSTEPS,
  DRUM_ROW_NAMES,
  SYNTH_ROW_NAMES,
  type PatternStateV2,
  type DrumStep,
} from './types';
import { defaultState } from './defaults';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const num = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

// À la sérialisation, pattern/rolls sont tronqués à subdiv (comme l'original) ;
// en mémoire ils font MAXSTEPS.
export function serializeState(state: PatternStateV2): string {
  const out: PatternStateV2 = JSON.parse(JSON.stringify(state));
  DRUM_ROW_NAMES.forEach((name) => {
    const r = out.rows[name];
    r.pattern = r.pattern.slice(0, r.subdiv);
    r.rolls = r.rolls.slice(0, r.subdiv);
  });
  return JSON.stringify(out, null, 2);
}

function padArray<T>(arr: T[], len: number, fill: T): T[] {
  const out = arr.slice(0, len);
  while (out.length < len) out.push(fill);
  return out;
}

// Import tolérant : champs manquants -> valeurs par défaut, valeurs hors
// bornes -> clamp. Un fichier v1 (sans synthRows/synthGlobal) importe
// proprement le drum et ignore juste le synthé.
export function deserializeState(json: string | object): PatternStateV2 {
  const raw = typeof json === 'string' ? JSON.parse(json) : (json as Record<string, unknown>);
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;

  base.tempo = clamp(num(r.tempo, 120), 40, 200);
  base.swing = clamp(num(r.swing, 0), 0, 75);
  base.drag = clamp(num(r.drag, 0), 0, 30);
  base.synthSwing = clamp(num(r.synthSwing, 0), 0, 75);
  base.synthDrag = clamp(num(r.synthDrag, 0), 0, 30);
  base.randomVelocity = clamp(num(r.randomVelocity, 0), 0, 100);
  base.spontRoll = clamp(num(r.spontRoll, 0), 0, 100);
  base.fillEvery = [0, 2, 4, 8].includes(num(r.fillEvery, 0)) ? num(r.fillEvery, 0) : 0;
  base.fillIntensity = clamp(num(r.fillIntensity, 50), 0, 100);
  base.ghostDensity = clamp(num(r.ghostDensity, 0), 0, 40);
  base.globalSaturation = clamp(num(r.globalSaturation, 0), 0, 100);
  base.globalCompression = clamp(num(r.globalCompression, 0), 0, 100);
  base.globalBitcrush = clamp(num(r.globalBitcrush, 0), 0, 100);
  base.finalVolume = clamp(num(r.finalVolume, 100), 50, 150);

  const rows = (r.rows || {}) as Record<string, Record<string, unknown>>;
  DRUM_ROW_NAMES.forEach((name) => {
    const src = rows[name];
    if (!src) return;
    const dst = base.rows[name];
    dst.subdiv = clamp(Math.round(num(src.subdiv, dst.subdiv)), 1, MAXSTEPS);
    const pat = Array.isArray(src.pattern) ? src.pattern : [];
    // v1 : kick en booléens, snare 0/1 — normalisés en 0/1/2.
    dst.pattern = padArray(
      pat.map((v): DrumStep => (v === true ? 1 : v === 2 ? 2 : v ? 1 : 0)),
      MAXSTEPS,
      0 as DrumStep,
    );
    const rolls = Array.isArray(src.rolls) ? src.rolls : [];
    dst.rolls = padArray(
      rolls.map((v) => clamp(Math.round(num(v, 1)), 1, 4)),
      MAXSTEPS,
      1,
    );
    dst.shiftPct = clamp(num(src.shiftPct, 0), -50, 50);
    dst.volume = clamp(num(src.volume, dst.volume), 0, 1.5);
    dst.muted = src.muted === true;
    dst.pitch = clamp(num(src.pitch, 0), -24, 24);
    dst.attack = clamp(num(src.attack, 0), 0, 100);
    dst.decay = clamp(num(src.decay, 0), -50, 50);
    dst.tone = clamp(num(src.tone, 0), -100, 100);
    dst.filterCutoff = clamp(num(src.filterCutoff, 20000), 200, 20000);
    dst.reverbSend = clamp(num(src.reverbSend, 0), 0, 1);
    dst.delaySend = clamp(num(src.delaySend, 0), 0, 1);
  });

  // Synthé : porté tel quel si présent (le moteur synthé validera à l'usage) —
  // un fichier v1 n'en a pas, l'état par défaut reste en place.
  const synthRows = r.synthRows as Record<string, unknown> | undefined;
  if (synthRows && typeof synthRows === 'object') {
    SYNTH_ROW_NAMES.forEach((name) => {
      const src = synthRows[name] as Record<string, unknown> | undefined;
      if (src) base.synthRows[name] = { ...base.synthRows[name], ...src };
    });
  }
  const synthGlobal = r.synthGlobal as Record<string, unknown> | undefined;
  if (synthGlobal && typeof synthGlobal === 'object') {
    base.synthGlobal = { ...base.synthGlobal, ...synthGlobal };
  }

  return base;
}
