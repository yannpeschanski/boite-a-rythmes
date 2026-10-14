/* Une reproduction repart de la proposition de la PRÉCÉDENTE.
 *
 * Retour de jeu : *« un peu chiant de devoir cliquer sur les 16 hats à chaque
 * niveau des actes rythme et groove »*. On teste le CÂBLAGE de `startLevel`,
 * et surtout ses trois gardes : ce que le joueur avait posé, jamais la cible ;
 * pas en rejouant le même niveau ; pas si la reprise résout le niveau.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { game, LEVELS } from '../src/stores/game.svelte';

const REPRO = LEVELS.flatMap((l, i) => (l.exercise === 'reproduire' && l.grille ? [i] : []));
const AUTRE = LEVELS.findIndex((l) => l.exercise === 'regler');

/* Deux niveaux écrits dont le charley a la même subdivision. */
function paire(): [number, number] {
  for (const a of REPRO)
    for (const b of REPRO)
      if (a !== b && LEVELS[a].grille!.subdiv.hat === LEVELS[b].grille!.subdiv.hat) return [a, b];
  throw new Error('aucune paire');
}

function poserCharley(): number[] {
  const n = game.subdiv.hat;
  for (let i = 0; i < n; i++) game.guess.hat[i] = i % 2 === 0 ? 1 : 0;
  return game.guess.hat.slice();
}

describe('la grille du joueur passe d’une reproduction à la suivante', () => {
  beforeEach(() => {
    game.pseudo = 'test';
  });

  it('il y a des reproductions écrites à enchaîner', () => {
    expect(REPRO.length).toBeGreaterThanOrEqual(2);
    expect(AUTRE).toBeGreaterThanOrEqual(0);
  });

  it('le charley posé revient au niveau suivant, sans verrou', () => {
    const [a, b] = paire();
    game.startLevel(a);
    const pose = poserCharley();
    game.startLevel(b);
    expect(game.guess.hat).toEqual(pose);
    expect(game.locked.hat.every((v) => !v)).toBe(true);
  });

  it('elle survit à un exercice d’un autre verbe posé entre les deux', () => {
    const [a, b] = paire();
    game.startLevel(a);
    const pose = poserCharley();
    game.startLevel(AUTRE);
    game.startLevel(b);
    expect(game.guess.hat).toEqual(pose);
  });

  it('⚠️ rejouer le MÊME niveau repart d’une grille vide', () => {
    const [a] = paire();
    game.startLevel(a);
    game.revealSolution();
    game.startLevel(a);
    expect(game.guess.hat.every((v) => v === 0)).toBe(true);
  });

  it('⚠️ une reprise qui résoudrait le niveau n’est pas faite', () => {
    const [a, b] = paire();
    game.startLevel(b);
    const cible = JSON.parse(JSON.stringify(game.target));
    game.startLevel(a);
    // Le joueur a posé, au niveau a, exactement la cible de b.
    (['kick', 'snare', 'hat'] as const).forEach((n) => {
      if (game.guess[n].length === cible[n].length) game.guess[n] = [...cible[n]];
    });
    game.startLevel(b);
    const exact = (['kick', 'snare', 'hat'] as const).every(
      (n) => game.guess[n].join() === game.target[n].join(),
    );
    expect(exact).toBe(false);
  });
});
