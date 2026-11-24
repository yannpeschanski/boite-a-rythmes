/* L'aide qui MONTE avec les essais (2026-11-24).
 *
 * Retour des testeurs : « trop difficile, besoin de plus d'accompagnement ».
 * Premier raté : les cases justes se verrouillent (comme avant). Deuxième :
 * les cases posées à tort sont marquées. Troisième : « Montre-moi une case »,
 * qui pose une case juste — sans pénalité : à ce stade la réussite vaut
 * déjà 1★, et c'est ce que l'écran dit.
 *
 * La partie pure se teste sur des grilles ; le CÂBLAGE (CLAUDE.md : quand un
 * module pur est testé et que le comportement reste faux, suspecter le
 * câblage) se teste sur le store, pour les trois familles de grille :
 * batterie, arrangement, mélodie. */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  casesFausses,
  caseAMontrer,
  ESSAIS_AVANT_MARQUES,
  ESSAIS_AVANT_AIDE,
} from '../src/model/exercises';
import { game, LEVELS } from '../src/stores/game.svelte';

const uns = (n: number) => new Array(n).fill(1);

describe('la partie pure', () => {
  const cible = { a: [1, 0, 1, 0], b: [0, 2, 0, 0, 0, 0, 0, 1] };
  const cr = { a: uns(4), b: uns(8) };

  it('désigne ce qui est POSÉ à tort, jamais un vide qui devrait sonner', () => {
    const prop = { a: [1, 1, 0, 0], b: [0, 1, 0, 0, 0, 0, 0, 0] };
    expect(casesFausses(cible, cr, prop, { a: uns(4), b: uns(8) }, ['a', 'b'])).toEqual([
      { row: 'a', col: 1 }, // un coup en trop
      { row: 'b', col: 1 }, // le bon pas, la mauvaise valeur
    ]);
  });

  it('une rafale fausse rend la case fausse, comme dans `comparerGrilles`', () => {
    const prop = { a: [1, 0, 1, 0], b: [0, 2, 0, 0, 0, 0, 0, 1] };
    const pr = { a: [1, 1, 3, 1], b: uns(8) };
    expect(casesFausses(cible, cr, prop, pr, ['a', 'b'])).toEqual([{ row: 'a', col: 2 }]);
  });

  it('ne regarde que les colonnes notées', () => {
    const prop = { a: [1, 1, 1, 1], b: uns(8) };
    expect(casesFausses<'a' | 'b'>(cible, cr, prop, { a: uns(4), b: uns(8) }, ['a'], { a: [3] })).toEqual([
      { row: 'a', col: 3 },
    ]);
  });

  it('montre d’abord un coup MANQUANT, le plus tôt dans la mesure, hors verrous', () => {
    const vide = { a: [0, 0, 0, 0], b: new Array(8).fill(0) };
    // a[0] et b[1] : a[0] est à 0/4, b[1] à 1/8 — a[0] d'abord.
    expect(caseAMontrer(cible, cr, vide, { a: uns(4), b: uns(8) }, ['a', 'b'], {})).toEqual({ row: 'a', col: 0 });
    expect(
      caseAMontrer(cible, cr, vide, { a: uns(4), b: uns(8) }, ['a', 'b'], { a: [true, false, false, false] }),
    ).toEqual({ row: 'b', col: 1 });
    // Un coup en trop ne passe qu'après les coups manquants.
    const trop = { a: [1, 1, 1, 0], b: [0, 0, 0, 0, 0, 0, 0, 1] };
    expect(caseAMontrer(cible, cr, trop, { a: uns(4), b: uns(8) }, ['a', 'b'], {})).toEqual({ row: 'b', col: 1 });
  });

  it('ne montre rien quand tout est juste', () => {
    expect(caseAMontrer(cible, cr, cible, cr, ['a', 'b'], {})).toBeNull();
  });

  it('les paliers sont dans l’ordre : marques, puis aide', () => {
    expect(ESSAIS_AVANT_MARQUES).toBeGreaterThan(1);
    expect(ESSAIS_AVANT_AIDE).toBeGreaterThan(ESSAIS_AVANT_MARQUES);
  });
});

const parId = (id: number) => LEVELS.findIndex((l) => l.id === id);

function rater(n: number) {
  for (let i = 0; i < n; i++) expect(game.verify()).toBe(false);
}

describe('le câblage — la batterie', () => {
  beforeEach(() => {
    game.pseudo = 'aide-test';
    game.startLevel(parId(3));
    // Une grille vide (la reprise de la grille précédente ne doit pas jouer ici).
    for (const r of ['kick', 'snare', 'hat'] as const) game.guess[r].fill(0);
  });

  it('premier raté : aucune marque, aucun bouton', () => {
    game.guess.kick[1] = 1; // un coup en trop
    rater(1);
    expect(game.estMarquee('kick', 1)).toBe(false);
    expect(game.peutMontrer).toBe(false);
  });

  it('deuxième raté : la case posée à tort est marquée, et la retoucher la démarque', () => {
    game.guess.kick[1] = 1;
    rater(2);
    expect(game.estMarquee('kick', 1)).toBe(true);
    expect(game.peutMontrer).toBe(false);
    game.cycleCell('kick', 1);
    expect(game.estMarquee('kick', 1)).toBe(false);
  });

  it('troisième raté : une case juste est posée et verrouillée, et la réussite vaut 1★ comme annoncé', () => {
    rater(3);
    expect(game.peutMontrer).toBe(true);
    const c = game.montrerUneCase();
    expect(c).not.toBeNull();
    const row = c!.row as 'kick' | 'snare' | 'hat';
    expect(game.guess[row][c!.col]).toBe(game.target[row][c!.col]);
    expect(game.locked[row][c!.col]).toBe(true);
    // Puis on finit seul. ⚠️ Ce que l'écran PROMET (« la réussite vaudra
    // 1★ ») : si le barème des essais change, ce test le dira.
    for (const r of ['kick', 'snare', 'hat'] as const) {
      game.guess[r] = [...game.target[r]];
      game.guessRolls[r] = [...game.targetRolls[r]];
    }
    expect(game.verify()).toBe(true);
    expect(game.lastResult?.stars).toBe(1);
  });

  it('un nouveau niveau repart sans marque ni case montrée', () => {
    game.guess.kick[1] = 1;
    rater(3);
    game.montrerUneCase();
    game.startLevel(parId(68));
    expect(Object.keys(game.marques)).toHaveLength(0);
    expect(game.peutMontrer).toBe(false);
  });
});

describe('le câblage — l’arrangement et la mélodie', () => {
  beforeEach(() => {
    game.pseudo = 'aide-test';
  });

  it('arrangement : marque une note fausse, puis montre une case juste', () => {
    game.startLevel(parId(83));
    const ligne = 'melody';
    const col = game.arrCible[ligne].findIndex((v, i) => i > 0 && v > 0);
    game.arrViser(ligne, col);
    game.arrPoserNote(game.arrCible[ligne][col] === 1 ? 2 : 1);
    rater(2);
    expect(game.estMarquee(ligne, col)).toBe(true);
    rater(1);
    const c = game.montrerUneCase();
    expect(c).not.toBeNull();
    expect(game.arrGuess[c!.row][c!.col]).toBe(game.arrCible[c!.row][c!.col]);
    expect(game.arrLocked[c!.row][c!.col]).toBe(true);
  });

  it('mélodie : même chemin, sur sa ligne unique', () => {
    const i = LEVELS.findIndex((l) => l.exercise === 'melodie');
    expect(i).toBeGreaterThanOrEqual(0);
    game.startLevel(i);
    const col = game.melodieCible.findIndex((v, k) => k > 0 && v > 0);
    game.poserNote(col, game.melodieCible[col] === 1 ? 2 : 1);
    rater(2);
    expect(game.estMarquee('melodie', col)).toBe(true);
    rater(1);
    const c = game.montrerUneCase();
    expect(c).not.toBeNull();
    expect(game.melodieGuess[c!.col]).toBe(game.melodieCible[c!.col]);
    expect(game.melodieLocked[c!.col]).toBe(true);
  });

  it('un verbe sans grille ne propose jamais l’aide', () => {
    game.startLevel(LEVELS.findIndex((l) => l.exercise === 'regler'));
    game.verify();
    game.verify();
    game.verify();
    expect(game.peutMontrer).toBe(false);
    expect(game.montrerUneCase()).toBeNull();
  });
});
