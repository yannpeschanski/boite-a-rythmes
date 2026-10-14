/* La synchro image/son — le câblage, pas le calcul.
 *
 * ⚠️ La case qui avance suit le retard que le navigateur DÉCLARE, et ce chiffre
 * ment au casque (Firefox + Bluetooth : 22 ms pour ~180). Le réglage à l'œil
 * (`ui/synchroImage.svelte.ts`) retarde l'image d'autant, pour TOUTES les vues :
 * ce test tient qu'il atteint bien `consumePlayhead`, le seul endroit qui
 * allume une case. */
import { describe, it, expect, afterEach } from 'vitest';
import { AudioEngine } from '../src/engine/AudioEngine';
import { defaultState } from '../src/model/defaults';
import { synchroImage, IMAGE_MAX_MS, IMAGE_MIN_MS } from '../src/ui/synchroImage.svelte';

function moteurA(currentTime: number) {
  const etat = defaultState();
  const e = new AudioEngine(() => etat);
  const m = e as unknown as { ctx: unknown; playheadQueue: { name: string; col: number; time: number }[] };
  m.ctx = { currentTime, outputLatency: 0.02 };
  m.playheadQueue.push({ name: 'kick', col: 0, time: 1 });
  return e;
}

afterEach(() => synchroImage.regler(0));

describe('synchro image / son', () => {
  it('sans réglage, la case s’allume quand le son DÉCLARÉ arrive', () => {
    synchroImage.regler(0);
    // 1,03 − 0,02 de sortie déclarée = 1,01 : le coup programmé à 1 est dû.
    expect(moteurA(1.03).consumePlayhead()).toHaveLength(1);
  });

  it('avec 160 ms réglés (casque Bluetooth), la case attend le son réel', () => {
    synchroImage.regler(160);
    expect(AudioEngine.decalageImage).toBeCloseTo(0.16, 6);
    expect(moteurA(1.03).consumePlayhead(), 'trop tôt : le casque n’a rien joué').toHaveLength(0);
    expect(moteurA(1.19).consumePlayhead()).toHaveLength(1);
  });

  it('borne le réglage — un geste accidentel ne rend pas la grille illisible', () => {
    synchroImage.regler(5000);
    expect(synchroImage.ms).toBe(IMAGE_MAX_MS);
    synchroImage.regler(-5000);
    expect(synchroImage.ms).toBe(IMAGE_MIN_MS);
  });
});
