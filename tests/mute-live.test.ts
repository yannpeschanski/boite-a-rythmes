/* Le mute du Mode Live est TERNAIRE — et c'est le séquenceur qui l'a exigé.
 *
 * Avant : le Live ne savait qu'AJOUTER un mute par-dessus le motif, jamais en
 * retirer un. Le garde-fou était juste tant que le bouton était aveugle — il
 * empêchait une session live de réécrire l'Atelier en douce. Il devient faux
 * dès que le séquenceur affiche l'état RÉEL d'une ligne : une bande qui montre
 * « coupé » et refuse de rouvrir n'est pas un garde-fou, c'est une panne.
 *
 * Ce qui reste garanti, et que ce fichier vérifie aussi : rien n'est jamais
 * écrit dans le motif.
 */
import { describe, it, expect } from 'vitest';
import { coupee } from '../src/engine/groove';
import { AudioEngine } from '../src/engine/AudioEngine';
import { defaultState } from '../src/model/defaults';

describe('coupee — la définition unique de « cette ligne ne sonne pas »', () => {
  it('sans override, suit le motif', () => {
    expect(coupee(false, undefined)).toBe(false);
    expect(coupee(true, undefined)).toBe(true);
  });

  it('coupe une ligne que le motif laissait ouverte', () => {
    expect(coupee(false, true)).toBe(true);
  });

  it('ROUVRE une ligne coupée dans l’Atelier — le troisième état, celui qui manquait', () => {
    expect(coupee(true, false)).toBe(false);
  });
});

describe('l’override live n’écrit jamais dans le motif', () => {
  it('couper puis rouvrir laisse `muted` du motif intact', () => {
    const etat = defaultState();
    etat.rows.hat.muted = true; // coupée dans l'Atelier
    const engine = new AudioEngine(() => etat);

    engine.liveSetMute('hat', false); // rouverte en direct
    expect(coupee(etat.rows.hat.muted, engine.liveMuteDe('hat'))).toBe(false);
    expect(etat.rows.hat.muted).toBe(true); // le motif n'a pas bougé

    engine.liveSetMute('hat', null); // on relâche : on suit de nouveau le motif
    expect(engine.liveMuteDe('hat')).toBeUndefined();
    expect(coupee(etat.rows.hat.muted, engine.liveMuteDe('hat'))).toBe(true);
  });

  it('vaut aussi pour les lignes de synthé', () => {
    const etat = defaultState();
    etat.synthRows.pad.muted = true;
    const engine = new AudioEngine(() => etat);

    engine.liveSetSynthMute('pad', false);
    expect(engine.liveMuteSynthDe('pad')).toBe(false);
    expect(etat.synthRows.pad.muted).toBe(true);

    engine.liveSetSynthMute('pad', null);
    expect(engine.liveMuteSynthDe('pad')).toBeUndefined();
  });
});
