/* LE RETOUR DE JEU DU 2026-09-16 — ce qui s'est cassé en JOUANT.
 *
 * Cinq défauts rapportés par Yann après une partie, et aucun n'était visible
 * en relisant le code : chacun demandait d'être à un endroit précis du récit.
 * Ce fichier les fige, dans l'ordre où ils ont été rencontrés.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ranger, cleProduction, type Production } from '../src/model/discographie';
import { grooveOuvert, MODULE_UNLOCK_LEVEL } from '../src/model/unlocks';
import { ACTE_DU_GROOVE, ETAPE_DU_GROOVE, NB_ACTES, acteParId } from '../src/model/carriere';

/* Vitest tourne sous Node : pas de `localStorage`. Même stub minimal que
 * `tests/discographie.test.ts`. */
class FauxStockage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
}
const stockage = new FauxStockage();
if (!(globalThis as { localStorage?: unknown }).localStorage) {
  (globalThis as unknown as { localStorage: FauxStockage }).localStorage = stockage;
}

const prod = (acte: number, serie: string, titre: string): Production => ({
  acte, serie, titre, client: 'X', quand: 'un jour', etat: '{}',
});

describe('la DISCOGRAPHIE s’ouvre — la clé a DEUX moitiés', () => {
  /* ⚠️ « Erreur avec code erreur lorsqu'on souhaite accéder à la
   * discographie ». La vue keyait sa liste sur `p.acte` seul, alors que la clé
   * est (acte, série) depuis le 2026-09-01 : un acte qui livre plusieurs
   * morceaux donnait deux lignes de même clé, et Svelte lève
   * `each_key_duplicate`. L'écran tombait — pas une case mal placée, un écran
   * qui ne s'ouvre plus. */
  it('⚠️ deux morceaux du MÊME acte ont deux clés différentes', () => {
    const a = prod(6, 'passe-couplet', 'COUPLET');
    const b = prod(6, 'passe-refrain', 'REFRAIN');
    expect(cleProduction(a)).not.toBe(cleProduction(b));
  });

  it('… et la liste rangée n’a jamais deux fois la même clé', () => {
    /* C'est EXACTEMENT ce que la vue demande : `{#each … (cleProduction(p))}`.
     * Le test porte sur les sept boucles de l'acte 6 plus les quatre genres de
     * l'acte 5, les deux actes qui livrent plusieurs morceaux. */
    const liste = [
      prod(5, 'hip-hop', 'HIP-HOP'), prod(5, 'club', 'CLUB'), prod(5, 'latino', 'LATINO'),
      prod(6, 'passe-couplet', 'A'), prod(6, 'passe-refrain', 'B'),
      prod(6, 'seul-couplet', 'C'), prod(6, 'seul-refrain', 'D'),
      prod(6, 'attend-couplet', 'E'), prod(6, 'attend-refrain', 'F'),
      prod(6, 'attend-pont', 'G'),
    ].reduce(ranger, [] as Production[]);
    const cles = liste.map(cleProduction);
    expect(new Set(cles).size).toBe(cles.length);
  });

  it('une série vide reste une clé valide — les actes qui ne livrent qu’un morceau', () => {
    const sansSerie: Production = { acte: 1, titre: 'TA SONNERIE', client: 'TOI', quand: 'x', etat: '{}' };
    expect(cleProduction(sansSerie)).toBe('1:');
  });
});

describe('le panneau GROOVE attend que le récit le demande', () => {
  /* ⚠️ Il s'affichait sur le premier écran d'outil du jeu — la sonnerie de
   * l'acte 1 — avec six curseurs dont rien n'avait parlé. Et le piège est
   * l'autre bout : verrouillé jusqu'à la FRONTIÈRE de l'acte 2, il rendrait la
   * commande de Kelvin insatisfiable, puisqu'elle exige de l'aléa. */
  const neuf = { level: 1, plancher: 1 };

  it('⚠️ fermé pour un joueur neuf, et pendant tout l’acte 1', () => {
    expect(grooveOuvert({ ...neuf, acte: 0, etape: 0 })).toBe(false);
    expect(grooveOuvert({ ...neuf, acte: 1, etape: 3 })).toBe(false);
    // La sonnerie fait passer le curseur à l'acte 2 étape 0 : encore fermé.
    expect(grooveOuvert({ ...neuf, acte: 2, etape: 0 })).toBe(false);
  });

  it('⚠️ OUVERT à la commande de l’acte 2 — celle qui exige de l’aléa', () => {
    expect(ETAPE_DU_GROOVE).toBeLessThan(acteParId(ACTE_DU_GROOVE).etapes.length);
    expect(grooveOuvert({ ...neuf, acte: ACTE_DU_GROOVE, etape: ETAPE_DU_GROOVE })).toBe(true);
  });

  it('… et il ne se referme plus jamais', () => {
    for (let a = ACTE_DU_GROOVE + 1; a <= NB_ACTES; a++) {
      expect(grooveOuvert({ ...neuf, acte: a, etape: 0 }), `acte ${a}`).toBe(true);
    }
  });

  it('⚠️ celui qui avait déjà l’Atelier hors carrière le garde (le PLANCHER)', () => {
    // « Une porte déjà ouverte ne se referme jamais » : le plancher est celui
    // de l'Atelier, puisque ces six curseurs y vivent.
    const plancher = MODULE_UNLOCK_LEVEL.atelier;
    expect(grooveOuvert({ level: 40, plancher, acte: 0, etape: 0 })).toBe(true);
    expect(grooveOuvert({ level: 40, plancher: plancher - 1, acte: 0, etape: 0 })).toBe(false);
  });

  it('l’étape est DÉRIVÉE des données, pas écrite à la main', () => {
    const i = acteParId(ACTE_DU_GROOVE).etapes.findIndex((e) => e.kind === 'commande');
    expect(ETAPE_DU_GROOVE).toBe(i);
  });
});

describe('la CONCLUSION reste atteignable après une relecture', () => {
  /* ⚠️ « On n'arrive même pas à la conclusion… » `enRelecture` masque
   * l'épilogue — juste tant qu'on relit — mais rien ne l'éteignait, et le
   * dernier acte se termine en reposant le curseur volatil sur lui-même. Qui
   * avait cliqué une fois dans le carnet rejouait donc l'acte 7 en boucle. */
  beforeEach(() => stockage.clear());

  it('⚠️ finir le DERNIER acte pendant une relecture rend la fin du jeu', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.pseudo = '';
    game.setPseudo('fin');
    game.progress = { fin: { level: 1, stars: {}, carriere: { acte: NB_ACTES, etape: 0 } } };
    expect(game.enEpilogue).toBe(true);

    const dernier = NB_ACTES - 1;
    game.ouvrirActe(dernier);
    expect(game.enRelecture).toBe(true);
    expect(game.ecranEpilogue).toBe(null); // pendant la relecture : normal

    for (let i = 0; i < acteParId(dernier).etapes.length; i++) game.avancerCarriere();
    expect(game.enRelecture).toBe(false);
    expect(game.ecranEpilogue).not.toBe(null);
  });

  it('relire un acte du MILIEU ne saute pas à la fin', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.pseudo = '';
    game.setPseudo('milieu');
    game.progress = { milieu: { level: 1, stars: {}, carriere: { acte: NB_ACTES, etape: 0 } } };
    game.ouvrirActe(2);
    game.avancerCarriere();
    expect(game.enRelecture).toBe(true);
    expect(game.ecranEpilogue).toBe(null);
  });
});

describe('le CARNET reprend où l’on s’est arrêté', () => {
  /* ⚠️ « Il faut pouvoir reprendre au niveau où on s'est arrêtés et pas
   * uniquement à l'acte. » Le carnet repartait de l'étape 0 dans les deux
   * cas — donc la ligne qui dit « reprendre » renvoyait au premier écran. */
  beforeEach(() => stockage.clear());

  it('⚠️ l’acte EN COURS reprend à l’étape enregistrée', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.pseudo = '';
    game.setPseudo('carnet');
    game.progress = { carnet: { level: 1, stars: {}, carriere: { acte: 2, etape: 4 } } };
    game.ouvrirActe(2);
    expect(game.etapeActive).toBe(4);
    // Reprendre le sien n'est PAS une relecture : ce drapeau masque l'épilogue.
    expect(game.enRelecture).toBe(false);
  });

  it('un acte FAIT se relit depuis le début', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.pseudo = '';
    game.setPseudo('carnet2');
    game.progress = { carnet2: { level: 1, stars: {}, carriere: { acte: 3, etape: 2 } } };
    game.ouvrirActe(1);
    expect(game.etapeActive).toBe(0);
    expect(game.enRelecture).toBe(true);
  });

  it('une étape enregistrée au-delà de l’acte ne sort pas du tableau', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.pseudo = '';
    game.setPseudo('carnet3');
    game.progress = { carnet3: { level: 1, stars: {}, carriere: { acte: 2, etape: 999 } } };
    game.ouvrirActe(2);
    expect(game.etapeActive).toBeLessThan(acteParId(2).etapes.length);
    expect(game.etapeCourante).not.toBe(null);
  });
});

describe('RECHARGER la page ne renvoie pas au premier écran du jeu', () => {
  /* ⚠️ Le défaut le plus cher du retour : le curseur VOLATIL était posé par le
   * FORMULAIRE de pseudo (`setPseudo`). Le pseudo étant mémorisé depuis le
   * 2026-08-16, un rechargement passe par `load()` seul — la progression, les
   * modules et le carnet revenaient, le curseur restait à 0/0. Le joueur
   * atterrissait sur le tout premier écran du jeu avec, juste dessous, un
   * carnet qui affichait « ACTE 3 — EN COURS ». */
  beforeEach(() => stockage.clear());

  it('⚠️ un rechargement replace sur l’étape enregistrée', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.pseudo = '';
    game.setPseudo('revient');
    game.progress = { revient: { level: 1, stars: {}, carriere: { acte: 3, etape: 5 } } };
    // Ce que fait un rechargement : le pseudo est en mémoire, `App` appelle
    // `load()` et RIEN d'autre.
    stockage.setItem('boite-a-rythme:pseudo', 'revient');
    stockage.setItem('boite-a-rythme:progression', JSON.stringify(game.progress));
    game.pseudo = '';
    game.acteActif = 0;
    game.etapeActive = 0;
    game.load();

    expect(game.pseudo).toBe('revient');
    expect(game.acteActif).toBe(3);
    expect(game.etapeActive).toBe(5);
  });

  it('sans pseudo mémorisé, rien ne bouge — c’est le formulaire qui s’affiche', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.pseudo = '';
    game.acteActif = 0;
    game.etapeActive = 0;
    game.load();
    expect(game.pseudo).toBe('');
    expect(game.acteActif).toBe(0);
  });
});

describe('SUPPRIMER un profil emporte ses QUATRE données', () => {
  /* ⚠️ « Il faut pouvoir supprimer les profils. » Progression, besace,
   * discographie et banque de séquences vivent sous quatre clés : n'en oublier
   * qu'une laisserait un profil à moitié mort, qui ressusciterait en retapant
   * son nom avec les morceaux de l'ancien. */
  beforeEach(() => stockage.clear());

  it('⚠️ les quatre partent ensemble, et le pseudo actif est lâché', async () => {
    const { game } = await import('../src/stores/game.svelte');
    const { sequenceBank } = await import('../src/stores/bank.svelte');
    const { defaultState } = await import('../src/model/defaults');

    game.pseudo = '';
    game.setPseudo('aEffacer');
    game.archiverProduction(defaultState(), { acte: 1, titre: 'A', client: 'X', quand: 'x' });
    sequenceBank.save('une boucle');
    expect(game.productions).toHaveLength(1);
    expect(sequenceBank.entries).toHaveLength(1);

    game.supprimerJoueur('aEffacer');
    expect(game.pseudo).toBe('');
    expect(game.progress.aEffacer).toBeUndefined();
    expect(stockage.getItem('boite-a-rythme:productions')).not.toContain('aEffacer');

    // Et il ne ressuscite pas en retapant son nom.
    game.setPseudo('aEffacer');
    expect(game.productions).toHaveLength(0);
    expect(sequenceBank.entries).toHaveLength(0);
  });

  it('supprimer un AUTRE profil ne déconnecte pas celui qui joue', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.pseudo = '';
    game.setPseudo('autre');
    game.progress = { autre: { level: 1, stars: {} }, voisin: { level: 5, stars: {} } };
    game.supprimerJoueur('voisin');
    expect(game.pseudo).toBe('autre');
    expect(game.progress.autre).toBeDefined();
  });
});

describe('la BANQUE DE SÉQUENCES est rangée par profil', () => {
  /* ⚠️ « Les séquences sauvegardées doivent être associées au nom du
   * profil. » La progression, la besace et la discographie l'étaient ; la
   * banque, non — et l'acte 6 y range neuf boucles. */
  beforeEach(() => stockage.clear());

  it('⚠️ deux profils ne partagent pas leur banque', async () => {
    const { game } = await import('../src/stores/game.svelte');
    const { sequenceBank } = await import('../src/stores/bank.svelte');
    game.pseudo = '';
    game.setPseudo('alice');
    sequenceBank.save('chez alice');
    expect(sequenceBank.entries.map((e) => e.name)).toEqual(['chez alice']);

    game.setPseudo('bob');
    expect(sequenceBank.entries).toHaveLength(0);
    sequenceBank.save('chez bob');

    game.setPseudo('alice');
    expect(sequenceBank.entries.map((e) => e.name)).toEqual(['chez alice']);
  });

  it('⚠️ la banque d’AVANT les profils est adoptée une fois, pas dupliquée', async () => {
    /* Le format plat (un tableau) doit être relu, sinon les séquences déjà
     * enregistrées disparaissent alors qu'elles sont encore dans le stockage.
     * ⚠️ `vi.resetModules()` est nécessaire, pas décoratif : le store lit le
     * stockage dans son CONSTRUCTEUR, donc au premier import du fichier de
     * test. Sans module neuf, on testerait une banque déjà chargée. */
    stockage.setItem(
      'boite-a-rythme:sequence-bank',
      JSON.stringify([{ id: 'x1', name: 'héritage', json: '{}', savedAt: 1 }]),
    );
    vi.resetModules();
    const { sequenceBank } = await import('../src/stores/bank.svelte');
    expect(sequenceBank.profil).toBe('');
    expect(sequenceBank.entries.map((e) => e.name)).toEqual(['héritage']);

    // Le premier profil l'ADOPTE…
    sequenceBank.setProfil('premier');
    expect(sequenceBank.entries.map((e) => e.name)).toEqual(['héritage']);

    // … et le second n'en hérite pas : le seau est déplacé, pas copié.
    sequenceBank.setProfil('second');
    expect(sequenceBank.entries).toHaveLength(0);

    sequenceBank.setProfil('premier');
    expect(sequenceBank.entries.map((e) => e.name)).toEqual(['héritage']);
    vi.resetModules();
  });

  it('une entrée abîmée est ignorée, elle ne vide pas la banque', async () => {
    // Même principe que `lireMorceau` : une validation tout ou rien rendrait
    // le défaut et perdrait tout le reste, en silence.
    stockage.setItem(
      'boite-a-rythme:sequence-bank',
      JSON.stringify({ zoe: [{ id: 'a', name: 'bonne', json: '{}', savedAt: 1 }, { name: 'sans id' }] }),
    );
    vi.resetModules();
    const { sequenceBank } = await import('../src/stores/bank.svelte');
    sequenceBank.setProfil('zoe');
    expect(sequenceBank.entries.map((e) => e.name)).toEqual(['bonne']);
    vi.resetModules();
  });

  it('« master » ne s’écrit pas une banque à son nom — il ne persiste rien', async () => {
    const { game } = await import('../src/stores/game.svelte');
    const { sequenceBank } = await import('../src/stores/bank.svelte');
    game.pseudo = '';
    game.setPseudo('master');
    expect(sequenceBank.profil).toBe('');
  });
});
