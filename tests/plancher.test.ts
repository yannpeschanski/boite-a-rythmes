import { describe, it, expect, beforeEach } from 'vitest';
import { LEVELS } from '../src/model/presets/levels';

/* Le PLANCHER, côté store — la moitié que `tests/unlocks.test.ts` ne peut pas
 * voir. Là-bas on vérifie la RÈGLE (un plancher bas laisse le récit
 * gouverner) ; ici on vérifie QUAND il est gelé, ce qui est tout le sujet :
 * gelé une étape trop tard, il enregistrerait un `level` déjà gonflé par
 * l'exercice qu'on vient de réussir, et vaudrait exactement rien.
 *
 * D'où un vrai `localStorage` en mémoire plutôt qu'un objet posé à la main :
 * le défaut d'origine a survécu à sept PR parce qu'il était masqué par des
 * fixtures où `level` était écrit à la main (CLAUDE.md, « une fixture ne joue
 * pas le jeu »). On passe donc par le vrai chemin de chargement.
 */
const KEY = 'boite-a-rythme:progression';

class FauxStockage {
  private map = new Map<string, string>();
  /** Mis à `true` pour simuler la navigation privée stricte. */
  refuse = false;
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    if (this.refuse) throw new Error('QuotaExceededError');
    this.map.set(k, v);
  }
  removeItem(k: string): void {
    if (this.refuse) throw new Error('QuotaExceededError');
    this.map.delete(k);
  }
  clear(): void {
    this.map.clear();
  }
}

const stockage = new FauxStockage();
(globalThis as unknown as { localStorage: FauxStockage }).localStorage = stockage;

async function store() {
  return (await import('../src/stores/game.svelte')).game;
}

/** Ce qu'il y a VRAIMENT sur le disque, pas ce que le store a en mémoire. */
function surLeDisque(pseudo: string) {
  const brut = stockage.getItem(KEY);
  return brut ? JSON.parse(brut)[pseudo] : undefined;
}

describe('le plancher, gelé au chargement', () => {
  beforeEach(() => {
    stockage.refuse = false;
    stockage.clear();
  });

  it('gèle 1 pour un joueur neuf — donc aucun module par le niveau', async () => {
    const game = await store();
    game.pseudo = '';
    game.setPseudo('neuve');
    expect(game.playerProgress.plancher).toBe(1);
    expect(surLeDisque('neuve').plancher).toBe(1);
  });

  it('gèle ce qu’un vétéran avait déjà, sans lui rien reprendre', async () => {
    // Sauvegarde d'AVANT le champ : ni `plancher`, ni `carriere`.
    stockage.setItem(KEY, JSON.stringify({ ancien: { level: 40, stars: { '1': 3 } } }));
    const game = await store();
    game.pseudo = '';
    game.setPseudo('ancien');
    expect(game.playerProgress.plancher).toBe(40);
    // Et rien d'autre n'est touché : les étoiles survivent au gel.
    expect(game.playerProgress.stars['1']).toBe(3);
  });

  it('ne le réécrit JAMAIS, même quand le niveau monte ensuite', async () => {
    // La trajectoire du défaut : la carrière cite les niveaux 49-52, le joueur
    // les réussit, `level` grimpe à 53. Le plancher, lui, ne doit pas bouger —
    // sinon le seuil de 34 serait franchi et les quatre modules s'ouvriraient.
    stockage.setItem(KEY, JSON.stringify({ montant: { level: 53, stars: {}, plancher: 1 } }));
    const game = await store();
    game.pseudo = '';
    game.setPseudo('montant');
    expect(game.playerProgress.level).toBe(53);
    expect(game.playerProgress.plancher).toBe(1);
  });

  it('ne grave rien pour « master », qui est un outil de test', async () => {
    const game = await store();
    game.pseudo = '';
    game.setPseudo('master');
    expect(surLeDisque('master')).toBeUndefined();
    // Et il continue de tout voir : son `level` vaut le maximum, et sans
    // plancher c'est `level` qui sert de repli.
    expect(game.playerProgress.level).toBe(LEVELS.length);
    expect(game.playerProgress.plancher).toBeUndefined();
  });
});

describe('le stockage refusé cesse d’être silencieux', () => {
  beforeEach(() => {
    stockage.refuse = false;
    stockage.clear();
  });

  it('se remarque au chargement, avant toute écriture', async () => {
    const game = await store();
    stockage.refuse = true;
    game.pseudo = '';
    game.setPseudo('privee');
    expect(game.persistanceRefusee).toBe(true);
  });

  it('reste faux quand le navigateur écrit normalement', async () => {
    const game = await store();
    game.pseudo = '';
    game.setPseudo('normale');
    expect(game.persistanceRefusee).toBe(false);
  });
});
