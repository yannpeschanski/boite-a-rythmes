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

/* ⚠️ UNE CHAÎNE D'ENVOIS REPART DE CE QU'ON VIENT DE LIVRER.
 *
 * `partirDeLaLivraison` (acte 4, 2026-09-01) : *« les livraisons intermédiaires
 * doivent être remplacées par les nouvelles jusqu'à la fin de l'acte »* (Yann).
 * Sans ce test, la mécanique casserait en silence — le deuxième envoi
 * s'ouvrirait sur une table rase, le cahier de mixage deviendrait insatisfiable
 * pour une raison invisible, et le joueur chercherait longtemps.
 *
 * On monte le vrai store : ce qui est vérifié ici est un CÂBLAGE (la
 * discographie relue par `departCommande`), pas un calcul.
 */
describe('un envoi reprend le morceau livré à l’étape d’avant', () => {
  /* ⚠️ On RÉUTILISE le stockage déjà posé plus haut au lieu d'en installer un.
   * En poser un second remplaçait la référence que le test précédent tient
   * encore, et ce test-là se mettait à lire un stockage vide — un échec qui
   * n'a rien à voir avec ce qu'il vérifie. Deux describes qui se partagent un
   * global doivent se le partager pour de bon. */
  if (!(globalThis as { localStorage?: unknown }).localStorage) {
    class Stockage {
      private map = new Map<string, string>();
      getItem(k: string) { return this.map.get(k) ?? null; }
      setItem(k: string, v: string) { this.map.set(k, v); }
      removeItem(k: string) { this.map.delete(k); }
      clear() { this.map.clear(); }
    }
    (globalThis as unknown as { localStorage: Stockage }).localStorage = new Stockage();
  }

  it('⚠️ l’Atelier s’ouvre sur la production de l’acte, pas sur une table rase', async () => {
    const { game } = await import('../src/stores/game.svelte');
    const { etatVierge } = await import('../src/model/defaults');
    game.pseudo = '';
    game.setPseudo('chaine');

    // On se pose sur le DEUXIÈME envoi de l'acte 4 — celui qui reprend.
    const acte4 = ACTES.find((a) => a.id === 4)!;
    const i = acte4.etapes.findIndex(
      (e) => e.kind === 'commande' && (e as { partirDeLaLivraison?: boolean }).partirDeLaLivraison,
    );
    expect(i, 'aucune commande qui reprend une livraison').toBeGreaterThan(0);
    game.enCarriere = true;
    game.acteActif = 4;
    game.etapeActive = i;

    // Rien de livré : on retombe sur la table rase plutôt que de bloquer.
    expect(game.productions.filter((p) => p.acte === 4)).toHaveLength(0);
    expect(serializeState(game.departCommande())).toBe(serializeState(etatVierge()));

    // Une fois le premier envoi livré, c'est LUI qu'on reprend.
    const livre = defaultState();
    livre.tempo = 137;
    livre.rows.kick.filterCutoff = 4321;
    game.archiverProduction(livre, { acte: 4, titre: 'LE TUNNEL', client: 'LE TUNNEL', quand: 'un jour' });

    const depart = game.departCommande();
    expect(depart.tempo, 'le tempo du morceau livré').toBe(137);
    expect(depart.rows.kick.filterCutoff, 'et son mixage').toBe(4321);
  });
});

/* ⚠️ QUATRE GENRES DANS UN ACTE, ET LA DISCOGRAPHIE LES GARDE TOUS.
 *
 * Le défaut que ce test empêche de revenir se voit en jouant, pas en lisant :
 * l'acte 5 fait produire quatre morceaux (un par catégorie du fax de
 * Zik'Mobile), et tant que la clé d'unicité était l'ACTE, les trois premiers
 * étaient écrasés par le quatrième. Le joueur travaillait quatre fois pour
 * repartir avec un seul morceau.
 *
 * On monte le vrai `ranger` : ce qui est vérifié est la CLÉ, pas une intention.
 */
describe('un acte qui livre plusieurs genres les garde tous', () => {
  const p = (acte: number, serie: string | undefined, titre: string) => ({
    acte,
    serie,
    titre,
    client: 'X',
    etat: '{}',
    quand: 'un jour',
  });

  it('deux séries coexistent, une série se remplace', async () => {
    const { ranger } = await import('../src/model/discographie');
    let liste = ranger([], p(5, 'hip-hop', 'HIP-HOP'));
    liste = ranger(liste, p(5, 'club', 'CLUB'));
    expect(liste.map((x) => x.titre)).toEqual(['HIP-HOP', 'CLUB']);
    // La même série, relivrée : elle remplace, elle n'empile pas.
    liste = ranger(liste, p(5, 'hip-hop', 'HIP-HOP (bis)'));
    expect(liste.map((x) => x.titre)).toEqual(['CLUB', 'HIP-HOP (bis)']);
    expect(liste).toHaveLength(2);
  });

  it('⚠️ et une CHAÎNE d’envois se remplace toujours — même sans série', async () => {
    const { ranger } = await import('../src/model/discographie');
    // L'acte 4 : trois versions du même morceau, aucune série déclarée.
    let liste = ranger([], p(4, undefined, 'LE TUNNEL'));
    liste = ranger(liste, p(4, undefined, 'LE TUNNEL (V2)'));
    liste = ranger(liste, p(4, undefined, 'LE TUNNEL (V3)'));
    expect(liste.map((x) => x.titre)).toEqual(['LE TUNNEL (V3)']);
  });

  it('et l’acte 5 déclare bien quatre séries distinctes', async () => {
    const cmds = ACTES.find((a) => a.id === 5)!.etapes.filter((e) => e.kind === 'commande');
    const series = cmds.map((c) => (c as { serie?: string }).serie);
    expect(series).toHaveLength(4);
    expect(new Set(series).size).toBe(4);
  });
});

describe('chaque production du récit a un nom et un destinataire', () => {
  it('les huit livraisons sont nommées', () => {
    /* Sans titre ni client, la discographie serait une liste de fichiers.
     * C'est le récit qui range les morceaux, pas une date. */
    const prod = ACTES.flatMap((a) =>
      a.etapes
        .filter((e) => e.kind === 'commande' || e.kind === 'livraison')
        .map((e) => ({ acte: a.id, e: e as { titre: string; client: string } })),
    );
    /* Treize : les actes 3 et 4 enchaînent trois envois du même morceau, et
     * l'acte 5 livre quatre GENRES depuis le 2026-09-01.
     * ⚠️ Les trois du Tunnel portent des titres DIFFÉRENTS (LE TUNNEL, V2, V3)
     * alors qu'ils se remplacent l'un l'autre : c'est voulu, c'est le titre qui
     * dit au joueur laquelle des trois il réécoute. Les quatre de l'acte 5, à
     * l'inverse, coexistent — elles ont chacune leur SÉRIE. */
    expect(prod).toHaveLength(13);
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
