import { describe, it, expect } from 'vitest';
import { ranger, productionDeLActe, type Production } from '../src/model/discographie';
import { ACTES } from '../src/model/carriere';
import { deserializeState } from '../src/model/serialize';
import { serializeState } from '../src/model/serialize';
import { defaultState } from '../src/model/defaults';

const p = (acte: number, titre: string): Production => ({
  acte, titre, client: 'X', quand: 'un jour', etat: '{}',
});

describe('une production par ACTE, remplacée et jamais empilée', () => {
  it('ranger ajoute', () => {
    expect(ranger([], p(2, 'A'))).toHaveLength(1);
  });

  it('⚠️ relivrer le même acte REMPLACE, sans empiler', () => {
    /* Reculer dans le récit est gratuit (`reculerCarriere`) : si chaque
     * passage ajoutait une entrée, la discographie deviendrait un journal de
     * tentatives où le morceau qu'on cherche est noyé dans ses brouillons. */
    const l = ranger(ranger([], p(2, 'A')), p(2, 'B'));
    expect(l).toHaveLength(1);
    expect(l[0].titre).toBe('B');
  });

  it('et la liste reste dans l’ordre du récit, quel que soit l’ordre de livraison', () => {
    const l = [p(4, 'D'), p(1, 'A'), p(3, 'C'), p(2, 'B')].reduce(ranger, [] as Production[]);
    expect(l.map((x) => x.acte)).toEqual([1, 2, 3, 4]);
  });

  it('productionDeLActe retrouve la bonne, ou rien', () => {
    const l = ranger([], p(3, 'C'));
    expect(productionDeLActe(l, 3)?.titre).toBe('C');
    expect(productionDeLActe(l, 4)).toBeUndefined();
  });
});

describe('l’état voyage au format v2', () => {
  it('un aller-retour rend un morceau jouable', () => {
    // C'est tout l'intérêt de sérialiser plutôt que de garder l'objet : la
    // production survit au rechargement, et `deserializeState` la relira même
    // si le format bouge.
    const avant = defaultState();
    avant.tempo = 93;
    const apres = deserializeState(serializeState(avant));
    expect(apres.tempo).toBe(93);
    expect(apres.rows.kick.pattern.slice(0, 4)).toEqual(avant.rows.kick.pattern.slice(0, 4));
  });
});

describe('les DEUX chemins qui produisent un morceau vivent dans le STORE', () => {
  /* ⚠️ L'archivage de l'acte 1 était dans la VUE, celui des commandes dans le
   * store. Une règle à deux domiciles n'est appliquée qu'à un seul — et ici
   * l'ordre compte : archiver AVANT d'avancer, tant que le curseur désigne
   * encore l'acte livré. On monte donc le vrai store, avec un `localStorage`
   * en mémoire, plutôt que de relire le texte des fichiers. */
  class FauxStockage {
    private map = new Map<string, string>();
    getItem(k: string) { return this.map.get(k) ?? null; }
    setItem(k: string, v: string) { this.map.set(k, v); }
    removeItem(k: string) { this.map.delete(k); }
    clear() { this.map.clear(); }
  }
  const stockage = new FauxStockage();
  (globalThis as unknown as { localStorage: FauxStockage }).localStorage = stockage;

  it('le store expose les deux, et archive dans la discographie', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.pseudo = '';
    game.setPseudo('disco');
    expect(typeof game.livrerSonnerie).toBe('function');
    expect(typeof game.livrerCommande).toBe('function');

    game.archiverProduction(defaultState(), { acte: 1, titre: 'A', client: 'X', quand: 'un jour' });
    expect(game.productions).toHaveLength(1);
    // Relivrer le même acte remplace, il n'empile pas.
    game.archiverProduction(defaultState(), { acte: 1, titre: 'B', client: 'X', quand: 'un jour' });
    expect(game.productions).toHaveLength(1);
    expect(game.productions[0].titre).toBe('B');
    // Et c'est bien écrit sur le disque, pas seulement en mémoire.
    expect(stockage.getItem('boite-a-rythme:productions')).toContain('"titre":"B"');
  });

  it('archiver pose la réaction du client sur ce morceau-là', async () => {
    const { game } = await import('../src/stores/game.svelte');
    const maigre = defaultState();
    maigre.synthRows.bass.muted = false;
    maigre.synthRows.bass.subdivisions = 4;
    maigre.synthRows.bass.pattern = [1, null, 1, null];
    game.archiverProduction(maigre, { acte: 2, titre: 'C', client: 'X', quand: 'un jour' });
    expect(game.reactionLivraison?.id).toBe('basse-service-minimum');
  });
});

describe('chaque production du récit a un nom et un destinataire', () => {
  it('les six livraisons sont nommées', () => {
    /* Sans titre ni client, la discographie serait une liste de fichiers.
     * C'est le récit qui range les morceaux, pas une date. */
    const prod = ACTES.flatMap((a) =>
      a.etapes
        .filter((e) => e.kind === 'commande' || e.kind === 'livraison')
        .map((e) => ({ acte: a.id, e: e as { titre: string; client: string } })),
    );
    expect(prod).toHaveLength(6);
    for (const { acte, e } of prod) {
      expect(e.titre, `acte ${acte} : titre`).toBeTruthy();
      expect(e.client, `acte ${acte} : client`).toBeTruthy();
    }
  });

  it('et deux actes ne se rangent jamais sous le même titre', () => {
    const titres = ACTES.flatMap((a) =>
      a.etapes.filter((e) => e.kind === 'commande' || e.kind === 'livraison').map((e) => (e as { titre: string }).titre),
    );
    expect(new Set(titres).size).toBe(titres.length);
  });
});
