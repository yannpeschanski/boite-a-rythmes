import { describe, it, expect } from 'vitest';
import { defaultState } from '../src/model/defaults';
import { serializeState, deserializeState } from '../src/model/serialize';
import { PRESETS } from '../src/model/presets/songs';
import { presetToState } from '../src/model/presetAdapter';
import { LEVELS } from '../src/model/presets/levels';
import { MAXSTEPS } from '../src/model/types';
import { makeSeededRng } from '../src/engine/rng';
import { isFillBar, isLastSteps, randomizeGain, barDuration } from '../src/engine/groove';
import { euclideanRhythm } from '../src/engine/generators';

describe('sérialisation v2', () => {
  it('round-trip export/import préserve le drum', () => {
    const state = defaultState();
    state.tempo = 90;
    state.rows.kick.pattern[5] = 1;
    state.rows.kick.subdiv = 7;
    state.rows.snare.pattern[3] = 2;
    state.rows.hat.rolls[2] = 4;
    state.rows.clap.pattern[1] = 1;
    state.rows.shaker.pattern[6] = 1;
    state.rows.shaker.subdiv = 8;
    const back = deserializeState(serializeState(state));
    expect(back.tempo).toBe(90);
    expect(back.rows.kick.subdiv).toBe(7);
    expect(back.rows.kick.pattern[5]).toBe(1);
    expect(back.rows.snare.pattern[3]).toBe(2);
    expect(back.rows.hat.rolls[2]).toBe(4);
    expect(back.rows.clap.pattern[1]).toBe(1);
    expect(back.rows.shaker.pattern[6]).toBe(1);
    expect(back.rows.shaker.subdiv).toBe(8);
    expect(back.rows.kick.pattern).toHaveLength(MAXSTEPS);
  });

  it('un export v2 sans clap/shaker (fait avant leur ajout) importe proprement', () => {
    // Vieille sauvegarde : rows ne porte que kick/snare/hat, comme tout
    // fichier exporté avant l'ajout de ces deux lignes (PLAN.md §6).
    const v2 = {
      version: 2,
      tempo: 128,
      rows: {
        kick: { subdiv: 4, pattern: [1, 0, 1, 0] },
        snare: { subdiv: 4, pattern: [0, 1, 0, 1] },
        hat: { subdiv: 3, pattern: [1, 1, 1] },
      },
    };
    const state = deserializeState(JSON.stringify(v2));
    expect(state.tempo).toBe(128);
    expect(state.rows.kick.pattern.slice(0, 4)).toEqual([1, 0, 1, 0]);
    // clap/shaker retombent sur les valeurs par défaut (silencieuses), pas d'erreur
    expect(state.rows.clap.pattern.every((v) => v === 0)).toBe(true);
    expect(state.rows.shaker.pattern.every((v) => v === 0)).toBe(true);
    expect(state.rows.clap.subdiv).toBeGreaterThanOrEqual(1);
    expect(state.rows.shaker.subdiv).toBeGreaterThanOrEqual(1);
  });

  it('import v1 (kick booléens, pas de synthé) reste valide', () => {
    const v1 = {
      version: 1,
      tempo: 100,
      rows: { kick: { subdiv: 4, pattern: [true, false, true, false] } },
    };
    const state = deserializeState(JSON.stringify(v1));
    expect(state.tempo).toBe(100);
    expect(state.rows.kick.pattern.slice(0, 4)).toEqual([1, 0, 1, 0]);
    expect(state.synthGlobal.limitersEnabled).toBe(true);
  });

  it('clamp les valeurs hors bornes', () => {
    const state = deserializeState({ tempo: 999, swing: -10 });
    expect(state.tempo).toBe(200);
    expect(state.swing).toBe(0);
  });
});

describe('presets', () => {
  it('les 34 presets sont présents et convertibles en état v2', () => {
    expect(PRESETS).toHaveLength(34);
    for (const p of PRESETS) {
      const state = presetToState(p);
      expect(state.tempo).toBeGreaterThanOrEqual(40);
      expect(state.tempo).toBeLessThanOrEqual(200);
      for (const name of ['kick', 'snare', 'hat'] as const) {
        expect(state.rows[name].pattern).toHaveLength(MAXSTEPS);
        expect(state.rows[name].subdiv).toBeGreaterThanOrEqual(1);
        expect(state.rows[name].subdiv).toBeLessThanOrEqual(MAXSTEPS);
      }
      // Round-trip complet du preset converti
      const back = deserializeState(serializeState(state));
      expect(back.rows.kick.pattern.slice(0, back.rows.kick.subdiv)).toEqual(
        state.rows.kick.pattern.slice(0, state.rows.kick.subdiv),
      );
    }
  });

  it('les 34 niveaux du jeu sont présents', () => {
    expect(LEVELS).toHaveLength(34);
  });
});

describe('moteur — briques pures', () => {
  it('le PRNG seedé est déterministe', () => {
    const a = makeSeededRng(42);
    const b = makeSeededRng(42);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });

  it('groove : fill bar, zone de fill, vélocité', () => {
    const state = defaultState();
    state.fillEvery = 4;
    expect(isFillBar(state, 3)).toBe(true);
    expect(isFillBar(state, 4)).toBe(false);
    expect(isLastSteps(15, 16)).toBe(true);
    expect(isLastSteps(11, 16)).toBe(false);
    expect(barDuration(120)).toBe(2);
    // à vélocité aléatoire 0, le gain est inchangé
    expect(randomizeGain(0.8, 0, makeSeededRng(1))).toBe(0.8);
  });

  it('rythme euclidien : cas connus et cas limites', () => {
    // E(3,8) — tresillo cubain, motif canonique x..x..x.
    expect(euclideanRhythm(8, 3)).toEqual([true, false, false, true, false, false, true, false]);
    // E(4,8) — un coup sur deux
    expect(euclideanRhythm(8, 4)).toEqual([true, false, true, false, true, false, true, false]);
    // Cas limites : 0 coup -> tout silencieux, autant de coups que de pas -> tout actif
    expect(euclideanRhythm(5, 0)).toEqual([false, false, false, false, false]);
    expect(euclideanRhythm(5, 5)).toEqual([true, true, true, true, true]);
    // Toujours exactement `pulses` coups actifs, quel que soit le rythme
    expect(euclideanRhythm(16, 5).filter(Boolean)).toHaveLength(5);
  });
});
