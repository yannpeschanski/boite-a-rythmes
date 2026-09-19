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
    for (let n = 0; n < TIRAGES; n++) {
      game.startLevel(i);
      expect(game.buildState('target').rows.kick.muted).toBe(true);
    }
  });

  /* ⚠️ La génération d'un niveau passe par `Math.random()` : un test qui n'en
   * regarde qu'un tirage est un tirage au sort, pas un test. C'est exactement
   * ce qui est arrivé — « le hat a 8 pas sur 8 » est passé en local et sur la
   * PR, et a échoué sur `main` avec 7. Le remplissage tire des positions au
   * hasard avec un garde-fou : remplir la DERNIÈRE case sur huit est un
   * problème du collectionneur de vignettes, et 32 tirages n'y suffisent pas
   * toujours.
   *
   * Donc : on affirme ce qui doit être vrai à CHAQUE tirage, et on répète assez
   * pour que le hasard devienne de la couverture au lieu d'une pièce lancée.
   */
  const TIRAGES = 60;

  it('à vue : le hat porte la pulsation à chaque tirage — sans elle on jouerait dans le silence', () => {
    const i = niveauDeVerbe('jouer', 'lecture');
    for (let n = 0; n < TIRAGES; n++) {
      game.startLevel(i);
      const hat = game.buildState('target').rows.hat;
      expect(hat.muted).toBe(false);
      // Pas « toutes les croches » — le générateur n'en donne pas la garantie.
      // Ce qui compte est qu'il en reste assez pour que la pulsation soit sans
      // ambiguïté : un trou occasionnel s'entend comme une syncope, pas comme
      // une absence de tempo.
      const poses = hat.pattern.slice(0, hat.subdiv).filter((v) => v > 0).length;
      expect(poses).toBeGreaterThanOrEqual(Math.ceil(hat.subdiv * 0.75));
    }
  });

  it('jamais un seul coup à jouer, quel que soit le tirage', () => {
    // Le générateur en sort un dans 0,86 % des cas (mesuré) : assez rare pour
    // ne jamais se voir en essayant, assez fréquent pour tomber sur un joueur.
    for (const indice of ['ecoute', 'lecture']) {
      const i = niveauDeVerbe('jouer', indice);
      for (let n = 0; n < TIRAGES; n++) {
        game.startLevel(i);
        expect(game.frappesAttendues).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('à l’oreille : le kick SONNE, et c’est la vue qui ne donne rien', () => {
    const i = niveauDeVerbe('jouer', 'ecoute');
    for (let n = 0; n < TIRAGES; n++) {
      game.startLevel(i);
      expect(game.buildState('target').rows.kick.muted).toBe(false);
    }
  });

  it('le nombre de coups attendus est celui du kick, pas celui de la grille', () => {
    game.startLevel(niveauDeVerbe('jouer', 'ecoute'));
    expect(game.frappesAttendues).toBe(game.target.kick.filter((v) => v > 0).length);
  });

  it('les autres verbes ne coupent jamais rien', () => {
    game.startLevel(0); // niveau 1, « reproduire »
    for (const name of GAME_DRUM_ROWS) {
      expect(game.buildState('target').rows[name].muted).toBe(false);
    }
  });

  /* ---- La validation AUTOMATIQUE ----
   *
   * ⚠️ Retour de jeu (2026-09-17) : *« pour les niveaux 1, 2 et 3 où on joue,
   * ce n'est pas clair qu'il suffit de dépasser [le seuil] pour valider le
   * niveau »*.
   * Il n'y a plus de bouton : dix frappes au-dessus du seuil et c'est gagné.
   * Ces tests tiennent le CÂBLAGE (le calcul est pur, il est dans
   * `tests/exercises.test.ts`) — et surtout le PRIX, qui est la raison pour
   * laquelle la vue demande avant d'appeler `verify()`.
   */
  it('dix frappes propres valident sans qu’on clique rien', () => {
    game.startLevel(niveauDeVerbe('jouer', 'ecoute'));
    for (let i = 0; i < game.coupsAValider - 1; i++) game.enregistrerFrappe(0, 0.1);
    expect(game.jouerPret(), 'une frappe avant le compte : pas encore').toBe(false);
    game.enregistrerFrappe(0, 0.1);
    expect(game.jouerPret()).toBe(true);
    expect(game.verify()).toBe(true);
    expect(game.solved).toBe(true);
  });

  it('elle ne coûte AUCUNE étoile : un « jouer » réussi l’est du premier coup', () => {
    /* C'est tout le point du `jouerPret()` de la vue. Laisser `verify()`
     * trancher à chaque frappe compterait un essai par coup joué — dix frappes,
     * dix essais, une étoile au lieu de trois (`starsForAttempts`) et un roast
     * qui parle de dizaines de tentatives. */
    game.startLevel(niveauDeVerbe('jouer', 'ecoute'));
    for (let i = 0; i < game.coupsAValider; i++) game.enregistrerFrappe(0, 0.1);
    game.verify();
    expect(game.attempts).toBe(1);
    expect(game.lastResult?.stars).toBe(3);
  });

  it('le compte à tenir ne descend jamais sous ce que la boucle demande', () => {
    for (const indice of ['ecoute', 'lecture']) {
      const i = niveauDeVerbe('jouer', indice);
      for (let n = 0; n < TIRAGES; n++) {
        game.startLevel(i);
        expect(game.coupsAValider).toBeGreaterThanOrEqual(game.frappesAttendues);
        expect(game.coupsAValider).toBeGreaterThanOrEqual(10);
      }
    }
  });

  it('marteler à côté ne valide jamais, même en jouant longtemps', () => {
    game.startLevel(niveauDeVerbe('jouer', 'ecoute'));
    for (let i = 0; i < 40; i++) game.enregistrerFrappe(i % 2 ? 300 : -300, 0.5);
    expect(game.jouerPret()).toBe(false);
    expect(game.verify()).toBe(false);
  });

  it('les autres verbes ne se valident pas tout seuls', () => {
    // Le garde-fou de câblage : `jouerPret` est interrogé après chaque frappe,
    // et une frappe peut arriver sur n'importe quel niveau chargé.
    game.startLevel(0); // niveau 1, « reproduire »
    for (let i = 0; i < 20; i++) game.enregistrerFrappe(0, 0.1);
    expect(game.jouerPret()).toBe(false);
  });

  it('un niveau déjà gagné ne se revalide pas', () => {
    game.startLevel(niveauDeVerbe('jouer', 'ecoute'));
    for (let i = 0; i < game.coupsAValider; i++) game.enregistrerFrappe(0, 0.1);
    game.verify();
    expect(game.jouerPret(), 'sinon chaque frappe de plus rappellerait le carillon').toBe(false);
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
