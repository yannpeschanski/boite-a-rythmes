/* L'horloge des grilles écoute l'HORODATAGE de sortie quand il en dit plus.
 *
 * ⚠️ « La synchro se fait partout ailleurs et automatiquement, pourquoi pas
 * ici ? » (2026-10-14). Firefox Android déclare `outputLatency` ~22 ms au
 * casque Bluetooth pour ~180 réels ; `getOutputTimestamp()` est la source que
 * la norme prévoit pour synchroniser une image. Ce test tient le CÂBLAGE : le
 * plus grand des deux retards gagne, et sans horodatage rien ne change. */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AudioEngine } from '../src/engine/AudioEngine';
import { defaultState } from '../src/model/defaults';

function moteur(ctx: Record<string, unknown>) {
  const etat = defaultState();
  const e = new AudioEngine(() => etat);
  (e as unknown as { ctx: unknown }).ctx = ctx;
  return e;
}

/* Fait avancer l'horloge de la page par pas de 250 ms : l'échantillonnage
   n'en prend qu'un toutes les 200 ms. */
function avancer(e: AudioEngine, fois: number) {
  let t = 1000;
  const spy = vi.spyOn(performance, 'now').mockImplementation(() => t);
  for (let i = 0; i < fois; i++) {
    t += 250;
    e.latenceSortieMs();
  }
  return spy;
}

afterEach(() => vi.restoreAllMocks());

describe('le retard suivi par les grilles', () => {
  it('sans horodatage, reste le chiffre déclaré', () => {
    const e = moteur({ currentTime: 10, outputLatency: 0.022 });
    avancer(e, 5);
    expect(e.latenceSortieMs()).toBe(22);
  });

  it('casque Bluetooth : l’horodatage (180 ms) l’emporte sur le déclaré (22 ms)', () => {
    const ctx = {
      currentTime: 10,
      outputLatency: 0.022,
      // Ce qui SORT maintenant est l'instant du contexte d'il y a 180 ms.
      getOutputTimestamp: () => ({ contextTime: 10 - 0.18, performanceTime: performance.now() }),
    };
    const e = moteur(ctx);
    avancer(e, 5);
    expect(e.latenceSortieMs()).toBe(180);
  });

  it('un horodatage plus court que le déclaré ne change rien', () => {
    const ctx = {
      currentTime: 10,
      outputLatency: 0.2,
      getOutputTimestamp: () => ({ contextTime: 10 - 0.05, performanceTime: performance.now() }),
    };
    const e = moteur(ctx);
    avancer(e, 5);
    expect(e.latenceSortieMs()).toBe(200);
  });

  it('une horloge pas encore démarrée (horodatage à zéro) est ignorée', () => {
    const ctx = {
      currentTime: 10,
      outputLatency: 0.022,
      getOutputTimestamp: () => ({ contextTime: 0, performanceTime: 0 }),
    };
    const e = moteur(ctx);
    avancer(e, 5);
    expect(e.latenceSortieMs()).toBe(22);
  });
});
