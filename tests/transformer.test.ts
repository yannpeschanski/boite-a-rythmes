import { describe, it, expect } from 'vitest';
import { ACTES } from '../src/model/carriere';
import { LEVELS } from '../src/model/presets/levels';
import { etatVierge, etatDepuisGrille } from '../src/model/defaults';
import { evaluerCommande } from '../src/model/commande';
import type { PatternStateV2 } from '../src/model/types';

/* UNE COMMANDE QUI TRANSFORME — et la condition qui la rend honnête.
 *
 * ⚠️ Deux arbitrages se croisent ici, et il faut comprendre lequel gouverne.
 *
 * 1. (2026-08-27) « La check-list dans l'atelier est déjà remplie quand on
 *    ouvre l'exercice. Il faut que l'atelier soit bien vide. » → `etatVierge()`.
 * 2. (plus tard) « Pour l'acte 2 avec Kelvin, on pourrait commencer par
 *    retranscrire le rythme demandé, puis partir directement de ce rythme dans
 *    l'atelier et le transformer progressivement. » → `partirDu`.
 *
 * Ils semblent s'opposer. Ils ne s'opposent pas, parce que ce que le premier
 * interdit n'est pas « un Atelier non vide » : c'est **une case cochée avant
 * qu'on ait touché à quoi que ce soit**. Partir d'un rythme est donc permis à
 * une condition, et ce fichier EST cette condition — le cahier doit exiger ce
 * que son point de départ n'a pas.
 *
 * Sans ce test, la règle 2 rouvrirait la porte à la règle 1 par-derrière, et
 * personne ne le verrait avant de jouer.
 */

/** L'état sur lequel l'Atelier s'ouvre réellement pour cette commande. */
function departDe(e: { partirDu?: number }): PatternStateV2 {
  if (e.partirDu === undefined) return etatVierge();
  const l = LEVELS.find((x) => x.id === e.partirDu)!;
  return etatDepuisGrille(l.grille!, l.tempoOptions[0]);
}

const commandes = ACTES.flatMap((a) =>
  a.etapes.flatMap((e) => (e.kind === 'commande' ? [{ acte: a.id, e }] : [])),
);

describe('une commande s’ouvre TOUJOURS sur une check-list vide', () => {
  it('il y a bien des commandes à vérifier', () => {
    expect(commandes.length).toBeGreaterThanOrEqual(5);
  });

  it('⚠️ aucune TÂCHE n’est cochée à l’ouverture — table rase OU rythme de départ', () => {
    /* La règle, dans sa forme la plus forte : pas seulement « il faut y avoir
     * touché », mais AUCUNE des cases à faire. Une seule case cochée d'avance
     * et le joueur apprend que le cahier ne le regarde pas.
     *
     * ⚠️ Les INTERDICTIONS sont exclues, et c'est la seule exception —
     * « ton morceau, pas le preset chargé » est satisfaite tant qu'on ne
     * triche pas ; l'exiger décochée voudrait dire « commence par tricher ».
     * Elle est marquée dans les DONNÉES (`Contrainte.interdit`), pas nommée à
     * la main ici : une exception qu'on ne voit qu'en lisant un test est une
     * exception que personne ne voit. */
    for (const { acte, e } of commandes) {
      const v = evaluerCommande(departDe(e), e.cahier);
      const cochees = v.lignes
        .filter((l) => l.ok && !l.contrainte.interdit)
        .map((l) => l.contrainte.libelle);
      expect(cochees, `acte ${acte} — « ${e.entete} »`).toEqual([]);
    }
  });

  it('et une interdiction est bien satisfaite au départ — sinon ce serait une tâche', () => {
    // Le pendant du test précédent : si une contrainte marquée `interdit`
    // était fausse à l'ouverture, le marquage serait faux.
    for (const { acte, e } of commandes) {
      const v = evaluerCommande(departDe(e), e.cahier);
      for (const l of v.lignes) {
        if (!l.contrainte.interdit) continue;
        expect(l.ok, `acte ${acte} : « ${l.contrainte.libelle} » marquée interdit mais décochée`).toBe(true);
      }
    }
  });
});

describe('un point de départ ne se tire jamais au sort', () => {
  it('`partirDu` ne cite que des niveaux à GRILLE ÉCRITE', () => {
    /* Un niveau généré donnerait un point de départ différent à chaque partie,
     * donc un travail demandé différent à chaque partie — exactement le défaut
     * que les grilles écrites ont supprimé. */
    for (const { acte, e } of commandes) {
      if (e.partirDu === undefined) continue;
      const l = LEVELS.find((x) => x.id === e.partirDu);
      expect(l, `acte ${acte} : niveau ${e.partirDu} introuvable`).toBeTruthy();
      expect(l!.grille, `acte ${acte} : niveau ${e.partirDu} n’a pas de grille écrite`).toBeTruthy();
    }
  });

  it('et le même départ est reconstruit à l’identique', () => {
    for (const { e } of commandes) {
      if (e.partirDu === undefined) continue;
      expect(departDe(e)).toEqual(departDe(e));
    }
  });
});

describe('le rythme de départ est bien celui que le joueur vient de jouer', () => {
  it('l’étape citée par `partirDu` est un exercice du MÊME acte', () => {
    /* Sinon on lui rendrait un rythme qu'il n'a jamais vu, et « transforme
     * celle-là » ne voudrait rien dire. */
    for (const a of ACTES) {
      for (const e of a.etapes) {
        if (e.kind !== 'commande' || e.partirDu === undefined) continue;
        const joues = a.etapes
          .filter((x) => x.kind === 'exercice')
          .map((x) => (x as { niveau: number }).niveau);
        expect(joues, `acte ${a.id} : le départ ${e.partirDu} n’est pas joué dans l’acte`).toContain(
          e.partirDu,
        );
      }
    }
  });
});

describe('la commande de Kelvin, en détail', () => {
  const kelvin = commandes.find(({ e }) => e.partirDu !== undefined)!;

  it('part du rythme de l’acte 2, et il SONNE', () => {
    // Un départ vide serait une table rase déguisée.
    const d = departDe(kelvin.e);
    const coups = (['kick', 'snare', 'hat'] as const).reduce(
      (n, r) => n + d.rows[r].pattern.slice(0, d.rows[r].subdiv).filter((v) => v > 0).length,
      0,
    );
    expect(coups).toBeGreaterThan(0);
  });

  it('et chacune de ses exigences demande un vrai geste', () => {
    /* Le cœur : on vérifie contrainte par contrainte que le départ échoue.
     * C'est la même discipline que `tests/mixage.test.ts` — « un morceau techno
     * correct ne passe PAS le mixage ». */
    const d = departDe(kelvin.e);
    for (const c of kelvin.e.cahier) {
      expect(c.verifie(d), `« ${c.libelle} » est déjà satisfaite au départ`).toBe(false);
    }
    expect(kelvin.e.cahier.length).toBeGreaterThanOrEqual(3);
  });
});

describe('l’appli ouvre bien l’Atelier sur ce départ-là', () => {
  /* ⚠️ Les tests ci-dessus vérifient les DONNÉES. Celui-ci vérifie le
   * CÂBLAGE — et c'est la moitié qui manquait la dernière fois qu'un cahier se
   * cochait tout seul : le `DEPART` comparé n'était pas celui que l'écran
   * affichait. Deux vérités qui doivent coïncider, donc un test qui les
   * confronte. */
  class FauxStockage {
    private map = new Map<string, string>();
    getItem(k: string) { return this.map.get(k) ?? null; }
    setItem(k: string, v: string) { this.map.set(k, v); }
    removeItem(k: string) { this.map.delete(k); }
    clear() { this.map.clear(); }
  }
  (globalThis as unknown as { localStorage: FauxStockage }).localStorage = new FauxStockage();

  it('`departCommande()` rend exactement le rythme cité par l’étape', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.pseudo = '';
    game.setPseudo('transfo');
    for (const a of ACTES) {
      for (const [i, e] of a.etapes.entries()) {
        if (e.kind !== 'commande') continue;
        game.acteActif = a.id;
        game.etapeActive = i;
        expect(game.departCommande(), `acte ${a.id}`).toEqual(departDe(e));
      }
    }
  });
});
