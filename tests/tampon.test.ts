/* Le tampon de sortie suit la sortie — la règle, et ce qu'elle ne fait pas.
 *
 * Écrit après « ça marche assez mal avec le bluetooth » (Yann, 2026-08-26) :
 * des crachotements pendant la lecture, sur Android/Chrome, casque BT. La
 * cause est le petit tampon `'interactive'` demandé à une route lente — il
 * fait gagner 40 ms sur 250 (inaudible) et coûte un bloc manqué à chaque
 * réveil raté (très audible).
 *
 * Ce fichier tient les deux moitiés de la décision : la sortie normale ne
 * bascule JAMAIS (sinon on perd l'arbitrage du 2026-08-21 pour tout le monde),
 * et le réglage manuel gagne toujours sur l'observation (sinon il ne sert à
 * rien là où le navigateur est muet — WebKit ne déclare pas `outputLatency`).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  SEUIL_SORTIE_LENTE,
  sortieDeclareeLente,
  tamponPourSortie,
  noterSortie,
  sortieLente,
  oublierSortie,
  setPreferenceTampon,
  getPreferenceTampon,
  tamponCourant,
} from '../src/engine/tampon';
import { TAMPON_SORTIE } from '../src/engine/AudioEngine';

beforeEach(() => {
  oublierSortie();
  setPreferenceTampon('auto');
});

describe('ce qui compte comme une sortie lente', () => {
  it('ne l’est pas quand le navigateur ne déclare rien', () => {
    // WebKit ne renseigne pas `outputLatency`. « Je ne sais pas » n'est pas
    // « c'est lent » : sinon tous les iPhone joueraient sur un gros tampon,
    // haut-parleur intégré compris. C'est le réglage manuel qui répond là.
    expect(sortieDeclareeLente(undefined)).toBe(false);
  });

  it('ne l’est pas pour une sortie filaire, même sur le gros tampon', () => {
    // Mesures Chromium (2026-08-21) : 32 ms en 'interactive', 72 ms en
    // 'playback'. Les deux restent SOUS le seuil — une sortie filaire ne
    // bascule jamais, et ne se met donc jamais à basculer toute seule.
    expect(sortieDeclareeLente(0.032)).toBe(false);
    expect(sortieDeclareeLente(0.072)).toBe(false);
  });

  it('l’est dès qu’on entre dans les latences de casque A2DP', () => {
    // Un casque Bluetooth commence vers 100-150 ms et monte à 250.
    expect(sortieDeclareeLente(SEUIL_SORTIE_LENTE)).toBe(true);
    expect(sortieDeclareeLente(0.2)).toBe(true);
  });

  it('sépare bien les deux mondes : le seuil est entre les deux', () => {
    expect(SEUIL_SORTIE_LENTE).toBeGreaterThan(0.072);
    expect(SEUIL_SORTIE_LENTE).toBeLessThan(0.15);
  });
});

describe('la décision', () => {
  it('laisse le défaut du projet à une sortie normale', () => {
    // L'arbitrage « l'appli est un instrument, pas un lecteur » est intact
    // partout où la latence de sortie est encore disputable.
    expect(tamponPourSortie('auto', false)).toBe('interactive');
    expect(tamponPourSortie('auto', false)).toBe(TAMPON_SORTIE);
  });

  it('passe au gros tampon quand la sortie est déjà lente', () => {
    expect(tamponPourSortie('auto', true)).toBe('playback');
  });

  it('obéit au réglage manuel contre l’observation, dans les deux sens', () => {
    // Le point du réglage : il sert là où l'observation est aveugle. S'il ne
    // gagnait pas, il ne servirait à rien sur les plateformes muettes.
    expect(tamponPourSortie('large', false)).toBe('playback');
    expect(tamponPourSortie('court', true)).toBe('interactive');
  });
});

describe('l’observation de la session', () => {
  it('retient la lenteur une fois vue', () => {
    // `outputLatency` vaut souvent 0 juste après la création du contexte : le
    // flux n'est pas ouvert. Une lenteur vue ne doit pas se rétracter au
    // premier zéro passager, sinon la bascule dépend de l'instant de lecture.
    noterSortie(0.2);
    noterSortie(0);
    noterSortie(undefined);
    expect(sortieLente()).toBe(true);
    expect(tamponCourant()).toBe('playback');
  });

  it('ne se déclenche pas sur une sortie normale', () => {
    noterSortie(0.032);
    expect(sortieLente()).toBe(false);
    expect(tamponCourant()).toBe('interactive');
  });

  it('suit la préférence poussée par l’interface', () => {
    // Le moteur n'importe rien de Svelte : c'est l'interface qui lui pousse le
    // réglage (ui/sortie.svelte.ts). Si ce chemin casse, le menu ne fait rien.
    setPreferenceTampon('large');
    expect(getPreferenceTampon()).toBe('large');
    expect(tamponCourant()).toBe('playback');
  });
});
