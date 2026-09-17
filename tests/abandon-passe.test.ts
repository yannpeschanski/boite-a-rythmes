/* ABANDONNER FAIT PASSER À LA SUITE — et c'est une décision, pas un oubli.
 *
 * ⚠️ Arbitrage de Yann (2026-09-17), pris CONTRE l'intention de conception et
 * assumé comme tel : *« lorsqu'on abandonne, on n'est pas censé passer à la
 * suite, on doit persévérer pour débloquer le niveau. Mais pour tester
 * actuellement, ça facilite énormément les choses pour parcourir les
 * niveaux… donc il faut conserver cette fonctionnalité de cette manière, et ça
 * vaut donc pour les exercices en atelier. »*
 *
 * Le Mode jeu le faisait déjà : `giveUp()` rend 0★ et « Continuer ▸ » appelle
 * `avancerCarriere()` — *pas de game over dans cette histoire*. Le cahier de
 * l'Atelier, lui, refermait la commande et laissait le curseur sur place :
 * une règle à deux domiciles n'était appliquée qu'à un.
 *
 * Ce que ce fichier tient, c'est la SORTIE : aucun cahier du récit ne peut
 * retenir le joueur. Ce qu'il tient aussi, c'est le PRIX — ni étoile, ni
 * production. Si un jour l'arbitrage se renverse, c'est ce test qu'il faut
 * réécrire, et il dit pourquoi il existe.
 */
import { describe, it, expect } from 'vitest';
import { ACTES } from '../src/model/carriere';

class Stockage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
}
(globalThis as unknown as { localStorage: Stockage }).localStorage = new Stockage();

/** Toutes les commandes du récit, dans l'ordre où la carrière les joue. */
function toutesLesCommandes(): Array<{ acte: number; etape: number }> {
  const out: Array<{ acte: number; etape: number }> = [];
  for (const a of ACTES)
    for (const [i, e] of a.etapes.entries()) if (e.kind === 'commande') out.push({ acte: a.id, etape: i });
  return out;
}

/** Vrai si `b` est strictement APRÈS `a` dans le fil du récit. */
function apres(b: { acte: number; etape: number }, a: { acte: number; etape: number }): boolean {
  return b.acte > a.acte || (b.acte === a.acte && b.etape > a.etape);
}

describe('abandonner un cahier — le récit avance, la note non', () => {
  it('⚠️ AUCUN cahier ne peut retenir le joueur : les 20 abandonnent', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.pseudo = '';
    game.setPseudo('abandon1');
    const commandes = toutesLesCommandes();
    expect(commandes.length, 'la population ne doit pas devenir vide').toBeGreaterThan(10);

    for (const c of commandes) {
      game.acteActif = c.acte;
      game.etapeActive = c.etape;
      game.ouvrirCommande();
      expect(game.commande, `acte ${c.acte} étape ${c.etape}`).not.toBeNull();
      game.abandonnerCommande();
      expect(game.commande, `acte ${c.acte} : le cahier se referme`).toBeNull();
      expect(
        apres({ acte: game.acteActif, etape: game.etapeActive }, c),
        `acte ${c.acte} étape ${c.etape} : le curseur passe à la suite`,
      ).toBe(true);
      // Le curseur ENREGISTRÉ suit, sinon un rechargement reproposerait l'étape.
      expect(apres(game.progresCarriere, c) || game.progresCarriere.acte > c.acte).toBe(true);
    }
  });

  /* ⚠️ Le PRIX de l'abandon, et c'est lui qui empêche d'en faire la voie
   * normale : ni étoile, ni morceau dans la discographie. */
  it('ne pose aucune étoile et n’archive aucune production', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.pseudo = '';
    game.setPseudo('abandon2');
    const [premiere] = toutesLesCommandes();
    game.acteActif = premiere.acte;
    game.etapeActive = premiere.etape;
    game.ouvrirCommande();
    const productionsAvant = game.productions.length;
    game.abandonnerCommande();
    expect(game.etoilesDeCommande(premiere.acte, premiere.etape)).toBe(0);
    expect(game.productions.length).toBe(productionsAvant);
    // Rien à accuser réception : l'écran de carrière ne doit pas afficher la
    // réplique d'acceptation d'un client à qui on n'a rien livré.
    expect(game.commandeAcceptee).toBeNull();
  });

  /* ⚠️ MÊME CARVE-OUT QUE `livrerCommande` : refaire un cahier depuis la salle
   * de répétition ne touche pas au curseur, dans un sens comme dans l'autre. */
  it('⚠️ une RÉPÉTITION abandonnée ne bouge pas le curseur', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.pseudo = '';
    game.setPseudo('abandon3');
    const [premiere] = toutesLesCommandes();
    // On dépasse la commande pour qu'elle devienne « rencontrée ».
    game.acteActif = premiere.acte;
    game.etapeActive = premiere.etape + 1;
    game.avancerCarriere();
    const avant = { ...game.progresCarriere };

    expect(game.repeterCommande(premiere.acte, premiere.etape)).toBe(true);
    game.abandonnerCommande();
    expect(game.commande).toBeNull();
    expect(game.progresCarriere).toEqual(avant);
  });
});
