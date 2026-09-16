/* OÙ ON EN ÉTAIT — ce qu'un rechargement de page ne doit plus coûter.
 *
 * Demande de Yann (2026-09-16) : *« lorsqu'on réactualise la page, ce qui
 * arrive par erreur parfois, on puisse tester sur la même page et ne pas
 * perdre tout ce qu'on était en train de faire »*.
 *
 * Ce fichier tient les trois choses qui se cassent en silence : la PÉREMPTION
 * (sans elle, personne ne reverrait jamais l'accueil), la FUSION (chaque vue
 * note son champ, la dernière ne doit pas effacer les autres), et l'invariant
 * qui compte — reprendre une commande NE TOUCHE PAS au morceau.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

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

const CLE = 'boite-a-rythme:session';

/* ⚠️ Le module lit le stockage dans son CORPS, une fois : tester la lecture
 * demande donc un module NEUF à chaque fois (même raison que la banque de
 * séquences). Sans ça on testerait la valeur lue au premier import. */
async function sessionNeuve() {
  vi.resetModules();
  return import('../src/stores/session.svelte');
}

describe('la reprise a une PÉREMPTION — un rechargement, pas une visite', () => {
  beforeEach(() => stockage.clear());

  it('⚠️ une session fraîche se reprend', async () => {
    stockage.setItem(CLE, JSON.stringify({ vue: 'atelier', quand: Date.now() }));
    const { sessionReprise } = await sessionNeuve();
    expect(sessionReprise()?.vue).toBe('atelier');
  });

  it('⚠️ une session PÉRIMÉE ne se reprend pas — on repart de l’accueil', async () => {
    const { PEREMPTION_MS } = await import('../src/stores/session.svelte');
    stockage.setItem(
      CLE,
      JSON.stringify({ vue: 'atelier', quand: Date.now() - PEREMPTION_MS - 1000 }),
    );
    const { sessionReprise } = await sessionNeuve();
    expect(sessionReprise()).toBe(null);
  });

  it('une session sans horodatage ne se reprend pas non plus', async () => {
    // Un enregistrement d'une version antérieure, ou abîmé : on ne peut pas
    // savoir s'il est récent, donc il ne vaut pas reprise.
    stockage.setItem(CLE, JSON.stringify({ vue: 'atelier' }));
    const { sessionReprise } = await sessionNeuve();
    expect(sessionReprise()).toBe(null);
  });

  it('du JSON illisible ne fait pas tomber le démarrage', async () => {
    stockage.setItem(CLE, 'ceci n’est pas du JSON');
    const { sessionReprise } = await sessionNeuve();
    expect(sessionReprise()).toBe(null);
  });

  it('rien d’enregistré : rien à reprendre', async () => {
    const { sessionReprise } = await sessionNeuve();
    expect(sessionReprise()).toBe(null);
  });
});

describe('noter la session FUSIONNE, elle ne remplace pas', () => {
  /* ⚠️ Trois vues écrivent dans le même enregistrement, chacune son champ :
   * `App` la vue et la commande, `AtelierView` l'onglet, `GameView` l'écran du
   * Mode jeu. Un `setItem` qui écrase donnerait à la dernière montée le droit
   * d'effacer les autres — et la reprise serait partielle, au hasard. */
  beforeEach(() => stockage.clear());

  it('⚠️ trois écritures séparées tiennent ensemble', async () => {
    const { noterSession } = await sessionNeuve();
    noterSession({ vue: 'atelier' });
    noterSession({ onglet: 'synthe' });
    noterSession({ ecranJeu: 'exercice' });
    // Relu par un module neuf : c'est ce que fait le prochain chargement.
    const { sessionReprise } = await sessionNeuve();
    const s = sessionReprise()!;
    expect(s.vue).toBe('atelier');
    expect(s.onglet).toBe('synthe');
    expect(s.ecranJeu).toBe('exercice');
  });

  it('⚠️ `null` EFFACE — une commande livrée ne laisse pas de cahier fantôme', async () => {
    const { noterSession } = await sessionNeuve();
    noterSession({ vue: 'atelier', commande: { acte: 2, etape: 11, repetition: false } });
    noterSession({ commande: null });
    const { sessionReprise } = await sessionNeuve();
    expect(sessionReprise()?.commande).toBe(null);
    expect(sessionReprise()?.vue, 'la vue ne devait pas partir avec').toBe('atelier');
  });

  it('chaque écriture rafraîchit l’horodatage — la péremption compte depuis le DERNIER geste', async () => {
    const { noterSession } = await sessionNeuve();
    stockage.setItem(CLE, JSON.stringify({ vue: 'atelier', quand: 1 }));
    noterSession({ onglet: 'rythme' });
    const s = JSON.parse(stockage.getItem(CLE)!);
    expect(s.quand).toBeGreaterThan(1);
  });

  it('oublier remet à zéro — changer de joueur n’est pas un rechargement', async () => {
    const { noterSession, oublierSession } = await sessionNeuve();
    noterSession({ vue: 'live' });
    oublierSession();
    const { sessionReprise } = await sessionNeuve();
    expect(sessionReprise()).toBe(null);
  });
});

describe('AUCUNE CASE COCHÉE À L’OUVERTURE, rechargement compris', () => {
  /* ⚠️ LE CAS D'INTÉGRITÉ que la reprise automatique ouvrait, et le seul.
   *
   * L'autosave de l'Atelier n'enregistre que des MODIFICATIONS, jamais l'état
   * sur lequel il s'ouvre (règle du 2026-09-16, gardée). Donc juste après
   * `ouvrirCommande`, le stockage portait encore la session PRÉCÉDENTE : un
   * rechargement dans la seconde restaurait une ancienne composition dans un
   * cahier neuf — c'est-à-dire des cases cochées avant qu'on ait touché à quoi
   * que ce soit, exactement ce que `tests/transformer.test.ts` interdit.
   *
   * D'où `enregistrerAutosave()` appelé par `ouvrirCommande` : le DÉPART est
   * écrit tout de suite, sans attendre le débounce. */
  beforeEach(() => stockage.clear());

  it('⚠️ ouvrir une commande écrit son DÉPART dans l’autosave, tout de suite', async () => {
    vi.resetModules();
    const { game } = await import('../src/stores/game.svelte');
    const { pattern } = await import('../src/stores/pattern.svelte');
    const { lireAutosave, enregistrerAutosave } = await import('../src/stores/share');
    const { deserializeState } = await import('../src/model/serialize');
    const { evaluerCommande } = await import('../src/model/commande');
    const { ACTES } = await import('../src/model/carriere');

    game.pseudo = '';
    game.setPseudo('integrite');

    // UNE SESSION PRÉCÉDENTE : une composition bien remplie, enregistrée.
    pattern.state.tempo = 143;
    pattern.state.rows.kick.pattern = [1, 1, 1, 1];
    pattern.state.rows.snare.pattern = [0, 1, 0, 1];
    pattern.state.synthRows.melody.muted = false;
    pattern.state.synthRows.melody.pattern = [
      { degree: 1, octave: 0 },
      { degree: 3, octave: 0 },
      { degree: 5, octave: 0 },
      { degree: 1, octave: 0 },
    ];
    enregistrerAutosave();
    const ancienne = lireAutosave()!;
    expect(ancienne).toContain('143');

    // On ouvre une commande, et on ne touche à RIEN.
    const acte = ACTES.find((a) => a.etapes.some((e) => e.kind === 'commande'))!;
    const etape = acte.etapes.findIndex((e) => e.kind === 'commande');
    game.acteActif = acte.id;
    game.etapeActive = etape;
    game.ouvrirCommande();
    expect(game.commandeEnCours).toEqual({ acte: acte.id, etape });

    // L'autosave porte désormais le DÉPART, pas la composition d'avant.
    const apres = lireAutosave()!;
    expect(apres, 'l’autosave porte encore la session précédente').not.toBe(ancienne);
    expect(apres).toBe(pattern.toJson());

    // Et ce que le prochain chargement restaurerait ne coche AUCUNE case.
    const restaure = deserializeState(apres);
    const v = evaluerCommande(restaure, game.commande!.cahier, {
      depart: game.departCommande(),
    });
    expect(
      v.lignes.filter((l) => l.ok && !l.contrainte.interdit).map((l) => l.contrainte.id),
      'une tâche est cochée avant le moindre geste',
    ).toEqual([]);
  });

  it('… et l’ancienne composition aurait bien coché quelque chose', async () => {
    /* La contre-épreuve : sans le correctif, ce que la reprise aurait restauré
     * satisfait des lignes du cahier. Sans elle, le test précédent pourrait
     * passer pour une raison qui n'a rien à voir (un cahier que rien ne
     * satisfait jamais). */
    const { game } = await import('../src/stores/game.svelte');
    const { deserializeState, serializeState } = await import('../src/model/serialize');
    const { evaluerCommande } = await import('../src/model/commande');
    const { defaultState } = await import('../src/model/defaults');

    const ancienne = defaultState();
    ancienne.tempo = 143;
    const v = evaluerCommande(deserializeState(serializeState(ancienne)), game.commande!.cahier, {
      depart: game.departCommande(),
    });
    expect(v.lignes.some((l) => l.ok && !l.contrainte.interdit)).toBe(true);
  });
});

describe('REPRENDRE une commande ne touche pas au morceau', () => {
  /* ⚠️ L'invariant qui compte. `ouvrirCommande` et `repeterCommande` posent le
   * DÉPART du cahier : les appeler pour restaurer effacerait exactement le
   * travail qu'on cherche à retrouver. */
  beforeEach(() => stockage.clear());

  it('⚠️ le cahier revient, le pattern reste', async () => {
    vi.resetModules();
    const { game } = await import('../src/stores/game.svelte');
    const { pattern } = await import('../src/stores/pattern.svelte');
    const { ACTES } = await import('../src/model/carriere');

    game.pseudo = '';
    game.setPseudo('reprise');
    // Une commande du récit, n'importe laquelle.
    const acte = ACTES.find((a) => a.etapes.some((e) => e.kind === 'commande'))!;
    const etape = acte.etapes.findIndex((e) => e.kind === 'commande');

    // Du travail en cours, reconnaissable.
    pattern.state.tempo = 137;
    const avant = pattern.toJson();

    expect(game.reprendreCommande(acte.id, etape, false)).toBe(true);
    expect(game.commande).not.toBe(null);
    expect(game.commandeEnCours).toEqual({ acte: acte.id, etape });
    expect(pattern.toJson(), 'le morceau a été écrasé').toBe(avant);
    expect(pattern.state.tempo).toBe(137);
  });

  it('⚠️ une étape qui n’est plus une commande est refusée', async () => {
    const { game } = await import('../src/stores/game.svelte');
    const { ACTES } = await import('../src/model/carriere');
    game.commandeEnCours = null;
    const acte = ACTES[0];
    const recit = acte.etapes.findIndex((e) => e.kind === 'recit');
    expect(game.reprendreCommande(acte.id, recit, false)).toBe(false);
    expect(game.reprendreCommande(acte.id, 9999, false)).toBe(false);
    expect(game.commandeEnCours, 'un refus ne doit rien poser').toBe(null);
  });

  it('la répétition depuis la salle se reprend comme telle', async () => {
    const { game } = await import('../src/stores/game.svelte');
    const { ACTES } = await import('../src/model/carriere');
    const acte = ACTES.find((a) => a.etapes.some((e) => e.kind === 'commande'))!;
    const etape = acte.etapes.findIndex((e) => e.kind === 'commande');
    game.reprendreCommande(acte.id, etape, true);
    expect(game.repetitionCommande).toBe(true);
    // Et le curseur du récit n'a pas bougé pour autant.
    game.reprendreCommande(acte.id, etape, false);
    expect(game.repetitionCommande).toBe(false);
  });

  it('changer de joueur OUBLIE la session', async () => {
    const { game } = await import('../src/stores/game.svelte');
    const { noterSession } = await import('../src/stores/session.svelte');
    noterSession({ vue: 'atelier', commande: { acte: 2, etape: 11, repetition: false } });
    game.clearPseudo();
    expect(stockage.getItem(CLE)).toBe(null);
  });
});
