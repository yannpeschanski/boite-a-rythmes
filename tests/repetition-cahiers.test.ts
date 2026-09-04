/* REFAIRE UN CAHIER — la salle de répétition, l'abandon, et les étoiles.
 *
 * Demande de Yann (2026-09-04) : *« les exercices en ateliers, on doit pouvoir
 * y retourner dans la salle de répétition et abandonner en cours de route et
 * avoir des étoiles comme pour les autres exercices »*.
 *
 * Trois choses n'existaient pas, et la première explique les deux autres : la
 * salle listait des NIVEAUX, or une commande n'est pas un niveau — elle n'a pas
 * d'`id`, elle vit dans un acte. Il n'y avait donc ni chemin pour y revenir, ni
 * sortie une fois dedans, ni clé sous laquelle noter quoi que ce soit.
 *
 * On monte le vrai store : ce qui est vérifié ici est un CÂBLAGE.
 */
import { describe, it, expect } from 'vitest';
import { ACTES, commandesRencontrees } from '../src/model/carriere';
import { LEVELS } from '../src/model/presets/levels';
import { cleCommande } from '../src/stores/game.svelte';

class Stockage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
}
if (!(globalThis as { localStorage?: unknown }).localStorage) {
  (globalThis as unknown as { localStorage: Stockage }).localStorage = new Stockage();
}

/** La première commande du récit, et l'acte qui la porte. */
function premiereCommande(): { acte: number; etape: number } {
  for (const a of ACTES) {
    const i = a.etapes.findIndex((e) => e.kind === 'commande');
    if (i >= 0) return { acte: a.id, etape: i };
  }
  throw new Error('aucune commande');
}

describe('commandesRencontrees — rencontré, pas réussi', () => {
  it('n’en rend aucune au tout début', () => {
    expect(commandesRencontrees(0, 0)).toEqual([]);
  });

  /* ⚠️ Même règle que `niveauxRencontres`, et pour la même raison : l'étape SUR
   * laquelle le curseur est posé n'est pas « rencontrée ». On ne refait pas
   * celle qu'on est en train de jouer — on la joue. */
  it('⚠️ l’étape en cours n’en fait pas partie, celle d’avant si', () => {
    const { acte, etape } = premiereCommande();
    expect(commandesRencontrees(acte, etape)).toEqual([]);
    expect(commandesRencontrees(acte, etape + 1)).toEqual([{ acte, etape }]);
  });

  it('les actes précédents comptent en entier', () => {
    const toutes = commandesRencontrees(7, Number.MAX_SAFE_INTEGER);
    const total = ACTES.flatMap((a) => a.etapes.filter((e) => e.kind === 'commande')).length;
    expect(toutes).toHaveLength(total);
    expect(total).toBeGreaterThan(10);
  });
});

describe('la clé des étoiles d’un cahier', () => {
  /* ⚠️ Les niveaux rangent leur `id` en chaîne dans le MÊME dictionnaire. Une
   * clé de cahier qui ressemblerait à un nombre écraserait un jour les étoiles
   * d'un niveau, et le joueur verrait sa progression bouger sans rien avoir
   * fait. Le préfixe rend la collision impossible par construction. */
  it('⚠️ ne peut pas collisionner avec un identifiant de niveau', () => {
    const ids = new Set(LEVELS.map((l) => String(l.id)));
    for (const a of ACTES) {
      for (const [i, e] of a.etapes.entries()) {
        if (e.kind !== 'commande') continue;
        expect(ids.has(cleCommande(a.id, i)), `${a.id}.${i}`).toBe(false);
        expect(Number.isNaN(Number(cleCommande(a.id, i)))).toBe(true);
      }
    }
  });

  it('deux cahiers différents n’ont pas la même clé', () => {
    const cles = ACTES.flatMap((a) =>
      a.etapes.flatMap((e, i) => (e.kind === 'commande' ? [cleCommande(a.id, i)] : [])),
    );
    expect(new Set(cles).size).toBe(cles.length);
  });
});

describe('refaire un cahier depuis la salle de répétition', () => {
  it('⚠️ on ne peut pas répéter ce qu’on n’a pas encore rencontré', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.pseudo = '';
    game.setPseudo('repet');
    const { acte, etape } = premiereCommande();
    game.acteActif = acte;
    game.etapeActive = etape;
    expect(game.repeterCommande(acte, etape), 'l’étape en cours').toBe(false);
    expect(game.commandeEnCours).toBeNull();
  });

  /* Le cœur de la demande : une répétition REFAIT, elle n'avance pas. Le
   * curseur persisté ne bouge pas d'un cran — sans quoi refaire un vieux
   * cahier ferait sauter des étapes du récit. */
  it('⚠️ livrer une répétition ne fait pas avancer le récit', async () => {
    const { game } = await import('../src/stores/game.svelte');
    const { defaultState } = await import('../src/model/defaults');
    game.pseudo = '';
    game.setPseudo('repet2');
    const { acte, etape } = premiereCommande();
    // On dépasse la commande : elle devient « rencontrée ».
    game.acteActif = acte;
    game.etapeActive = etape + 1;
    game.avancerCarriere();
    const avant = { ...game.progresCarriere };

    expect(game.repeterCommande(acte, etape)).toBe(true);
    expect(game.repetitionCommande).toBe(true);
    expect(game.commande?.entete).toBe(
      (ACTES.find((a) => a.id === acte)!.etapes[etape] as { entete: string }).entete,
    );

    // Une livraison qui satisfait le cahier : on ne la fabrique pas ici (c'est
    // le rôle de `tests/commande.test.ts`), on vérifie le CÂBLAGE du refus.
    const v = game.livrerCommande(defaultState(), {});
    expect(v?.accepte, 'un état quelconque ne satisfait pas un cahier').toBe(false);
    // Refusée : la commande reste ouverte, et le curseur n'a pas bougé.
    expect(game.commandeEnCours).not.toBeNull();
    expect(game.progresCarriere).toEqual(avant);
  });

  /* ⚠️ Abandonner ferme la commande et ne pose AUCUNE étoile — mais n'efface
   * pas non plus celles d'une réussite précédente (`Math.max`). */
  it('abandonner rend la main sans avancer ni noter', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.pseudo = '';
    game.setPseudo('repet3');
    const { acte, etape } = premiereCommande();
    game.acteActif = acte;
    game.etapeActive = etape + 1;
    game.avancerCarriere();
    const avant = { ...game.progresCarriere };

    expect(game.repeterCommande(acte, etape)).toBe(true);
    game.abandonnerCommande();
    expect(game.commandeEnCours).toBeNull();
    expect(game.repetitionCommande).toBe(false);
    expect(game.commande).toBeNull();
    expect(game.etoilesDeCommande(acte, etape)).toBe(0);
    expect(game.progresCarriere).toEqual(avant);
  });

  /* La salle ne propose que ce qui a été traversé — la même règle que pour les
   * niveaux, vue depuis le store. */
  it('la salle ne propose que les cahiers traversés', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.pseudo = '';
    game.setPseudo('repet4');
    expect(game.commandesDeRepetition, 'un joueur neuf n’a rien à refaire').toEqual([]);
  });
});
