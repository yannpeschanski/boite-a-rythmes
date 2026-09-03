/* LA SALLE DE RÉPÉTITION — cliquer un numéro ouvre CE niveau-là.
 *
 * ⚠️ Bug trouvé en ouvrant le chantier final : la carte appelait
 * `startLevel(id - 1)`, c'est-à-dire une POSITION déduite d'un identifiant. Or
 * `LEVELS` n'est pas trié par id et rien ne l'impose — un niveau s'ajoute en
 * fin de tableau, et le 73 s'est retrouvé APRÈS les 74-78 le jour où le 78 a
 * été inséré avant lui. Résultat : huit niveaux ouvraient l'exercice du VOISIN,
 * en silence — l'écran affiche le numéro cliqué, le contenu est celui d'à côté.
 *
 * C'est la faute déjà payée par `demarrerEtape` (« on cherche par IDENTIFIANT,
 * pas par position », CLAUDE.md). Ce fichier la rend impossible à reproduire.
 */
import { describe, it, expect } from 'vitest';
import { game, LEVELS } from '../src/stores/game.svelte';
import { ACTES, NB_ACTES, niveauxRencontres, repereDeNiveau } from '../src/model/carriere';

describe('ouvrir un niveau par son identifiant', () => {
  it('⚠️ le tableau n’est PAS trié par id — c’est le point de départ du bug', () => {
    /* Ce test ne DEMANDE pas que le tableau soit trié : il constate qu'il ne
     * l'est pas, pour que personne ne refasse l'hypothèse. S'il devenait trié
     * un jour, la règle « chercher par id » resterait la bonne. */
    const decales = LEVELS.filter((l, i) => l.id !== i + 1);
    expect(decales.length, 'si le tableau redevient trié, garder quand même la recherche par id')
      .toBeGreaterThan(0);
  });

  it('⚠️ chaque niveau s’ouvre sur LUI-MÊME', () => {
    game.pseudo = 'test';
    for (const l of LEVELS) {
      game.startLevelById(l.id);
      expect(game.level.id, `le niveau ${l.id} ouvre le niveau ${game.level.id}`).toBe(l.id);
    }
  });

  it('⚠️ un identifiant inconnu ne change pas de niveau', () => {
    // Une progression qui cite un id disparu ne doit pas ouvrir un voisin au
    // hasard : elle ne doit rien faire.
    game.pseudo = 'test';
    game.startLevelById(LEVELS[3].id);
    const avant = game.level.id;
    game.startLevelById(9999);
    expect(game.level.id).toBe(avant);
  });
});

/* LE REPÈRE D'UN NIVEAU — « acte 1 · 3 » plutôt que « 67 ».
 *
 * ⚠️ C'est la « renumérotation par acte » du chantier final, faite à
 * l'AFFICHAGE. Changer `GameLevel.id` aurait touché `PlayerProgress.level`, les
 * clés de `stars` (qui SONT des ids), `partirDu` et toutes les sauvegardes déjà
 * écrites : une migration à risque pour un bénéfice visuel.
 */
describe('le repère d’un niveau — son acte et son rang', () => {
  it('⚠️ tout niveau que la salle peut montrer a un repère', () => {
    /* La salle ne liste que des niveaux RENCONTRÉS, donc cités par un acte.
     * Si l'un d'eux n'avait pas de repère, il disparaîtrait de l'écran sans
     * que rien ne le dise — un exercice joué, puis introuvable. */
    const vus = niveauxRencontres(NB_ACTES, 0);
    expect(vus.length).toBeGreaterThan(0);
    for (const id of vus) {
      expect(repereDeNiveau(id), `le niveau ${id} est cité mais n’a pas de repère`).toBeTruthy();
    }
  });

  it('⚠️ le repère est celui de la DÉCOUVERTE quand deux actes citent le même', () => {
    // C'est l'acte où on l'a rencontré dont on se souvient.
    for (const a of ACTES) {
      let rang = 0;
      for (const e of a.etapes) {
        if (e.kind !== 'exercice') continue;
        rang += 1;
        const r = repereDeNiveau(e.niveau)!;
        // Soit c'est ici qu'il a été découvert, soit c'était plus tôt.
        expect(r.acte, `niveau ${e.niveau}`).toBeLessThanOrEqual(a.id);
        if (r.acte === a.id) expect(r.rang).toBe(rang);
      }
    }
  });

  it('⚠️ le RÉSERVOIR n’a pas de repère — il n’a pas de nom dans le jeu', () => {
    const cites = new Set(niveauxRencontres(NB_ACTES, 0));
    const reservoir = LEVELS.filter((l) => !cites.has(l.id));
    expect(reservoir.length, 'plus de réservoir : ce test n’a plus d’objet').toBeGreaterThan(0);
    for (const l of reservoir) {
      expect(repereDeNiveau(l.id), `le niveau ${l.id} n’est cité par aucun acte mais a un repère`).toBe(null);
    }
  });
});
