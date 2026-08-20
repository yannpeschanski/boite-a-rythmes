/* « Joue en rythme » — le contrat des deux sens.
 *
 * Ce fichier existe pour UNE raison : si le kick cesse d'être coupé au niveau
 * « à vue », l'exercice devient trivial (on voit le motif ET on l'entend) et
 * rien à l'écran ne le signalerait. Le silence du kick n'est pas un détail
 * d'implémentation, c'est ce que le niveau demande.
 *
 * Test de store, contrairement au reste de la suite : c'est `buildState` qui
 * décide, et le vérifier ailleurs ne vérifierait qu'une intention.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { game, LEVELS, GAME_DRUM_ROWS } from '../src/stores/game.svelte';

function niveauDeVerbe(exercise: string, indice?: string): number {
  return LEVELS.findIndex((l) => l.exercise === exercise && (!indice || l.jouerIndice === indice));
}

describe('« jouer » — un seul canal à la fois', () => {
  beforeEach(() => {
    game.pseudo = 'test';
  });

  it('à vue : le kick est MUET, sinon voir et entendre rendrait l’exercice trivial', () => {
    const i = niveauDeVerbe('jouer', 'lecture');
    expect(i).toBeGreaterThanOrEqual(0);
    game.startLevel(i);
    expect(game.buildState('target').rows.kick.muted).toBe(true);
  });

  it('à vue : le hat porte la pulsation — sans elle on jouerait dans le silence', () => {
    game.startLevel(niveauDeVerbe('jouer', 'lecture'));
    const hat = game.buildState('target').rows.hat;
    expect(hat.muted).toBe(false);
    expect(hat.pattern.slice(0, hat.subdiv).filter((v) => v > 0).length).toBe(hat.subdiv);
  });

  it('à l’oreille : le kick SONNE, et c’est la vue qui ne donne rien', () => {
    game.startLevel(niveauDeVerbe('jouer', 'ecoute'));
    const state = game.buildState('target');
    expect(state.rows.kick.muted).toBe(false);
    expect(game.target.kick.filter((v) => v > 0).length).toBeGreaterThan(0);
  });

  it('le nombre de coups attendus est celui du kick, pas celui de la grille', () => {
    game.startLevel(niveauDeVerbe('jouer', 'ecoute'));
    expect(game.frappesAttendues).toBe(game.target.kick.filter((v) => v > 0).length);
    expect(game.frappesAttendues).toBeGreaterThan(1);
  });

  it('les autres verbes ne coupent jamais rien', () => {
    game.startLevel(0); // niveau 1, « reproduire »
    for (const name of GAME_DRUM_ROWS) {
      expect(game.buildState('target').rows[name].muted).toBe(false);
    }
  });

  it('effacer les frappes remet la justesse à zéro, pas le compte attendu', () => {
    game.startLevel(niveauDeVerbe('jouer', 'ecoute'));
    const attendues = game.frappesAttendues;
    game.enregistrerFrappe(5, 0.1);
    game.enregistrerFrappe(-8, 0.6);
    expect(game.justesse()).toBeGreaterThan(0);
    game.reinitialiserFrappes();
    expect(game.justesse()).toBe(0);
    expect(game.frappesAttendues).toBe(attendues);
  });
});
