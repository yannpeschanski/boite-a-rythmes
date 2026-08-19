/* La charpente des exercices du Mode jeu.
 *
 * Le premier bloc verrouille l'ÉQUIVALENCE : la comparaison extraite du store
 * doit noter exactement comme l'ancienne boucle câblée en dur. C'est le test
 * qui rend l'extraction sûre — sans lui, « ça compile » est tout ce qu'on
 * saurait.
 */
import { describe, it, expect } from 'vitest';
import { comparerGrilles, colonnesDeMesure, type Grille, type Rafales } from '../src/model/exercises';
import { LEVELS } from '../src/model/presets/levels';
import type { GameDrumRowName } from '../src/model/presets/levels';
import type { DrumStep } from '../src/model/types';

const LIGNES: GameDrumRowName[] = ['kick', 'snare', 'hat'];

function grille(kick: number[], snare: number[], hat: number[]): Grille {
  return { kick: kick as DrumStep[], snare: snare as DrumStep[], hat: hat as DrumStep[] };
}
function rafales(n: number): Rafales {
  return { kick: Array(n).fill(1), snare: Array(n).fill(1), hat: Array(n).fill(1) };
}

describe('comparerGrilles — la règle d’origine, déplacée sans être changée', () => {
  it('exact quand tout coïncide, et verrouille les cases actives justes', () => {
    const c = grille([1, 0, 1, 0], [0, 1, 0, 1], [1, 1, 1, 1]);
    const r = comparerGrilles(c, rafales(4), c, rafales(4), LIGNES);
    expect(r.exact).toBe(true);
    // 2 kick + 2 snare + 4 hat actifs = 8 cases à verrouiller ; les cases
    // vides justes ne se verrouillent pas (rien à protéger).
    expect(r.aVerrouiller).toHaveLength(8);
  });

  it('une seule case fausse suffit à invalider', () => {
    const c = grille([1, 0, 1, 0], [0, 1, 0, 1], [1, 1, 1, 1]);
    const p = grille([1, 0, 1, 0], [0, 1, 0, 1], [1, 1, 1, 0]);
    expect(comparerGrilles(c, rafales(4), p, rafales(4), LIGNES).exact).toBe(false);
  });

  it('la rafale compte autant que l’état — même grille, rafales différentes', () => {
    const c = grille([1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]);
    const rc = rafales(4);
    const rp = rafales(4);
    rp.kick[0] = 3;
    expect(comparerGrilles(c, rc, c, rp, LIGNES).exact).toBe(false);
  });
});

describe('comparerGrilles — la restriction par colonnes', () => {
  it('ne note que les colonnes demandées : une erreur hors zone ne compte pas', () => {
    const c = grille([1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]);
    const p = grille([9 as unknown as number, 9 as unknown as number, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]);
    // Les deux premières colonnes du kick sont fausses, mais hors zone notée.
    const zone = { kick: [2, 3], snare: [0, 1, 2, 3], hat: [0, 1, 2, 3] };
    expect(comparerGrilles(c, rafales(4), p, rafales(4), LIGNES, zone).exact).toBe(true);
    // Sans restriction, les mêmes grilles échouent — c'est bien la zone qui agit.
    expect(comparerGrilles(c, rafales(4), p, rafales(4), LIGNES).exact).toBe(false);
  });
});

describe('colonnesDeMesure — chaque ligne a sa propre subdivision', () => {
  it('découpe une ligne à 8 pas en 2 mesures de 4', () => {
    expect(colonnesDeMesure(8, 0, 2)).toEqual([0, 1, 2, 3]);
    expect(colonnesDeMesure(8, 1, 2)).toEqual([4, 5, 6, 7]);
  });

  it('découpe une ligne à 6 pas (polyrythmie) sans déborder', () => {
    // 6 pas sur 2 mesures : 3 par mesure, et surtout aucun index hors bornes —
    // c'est le cas que découper « au même index partout » casserait.
    expect(colonnesDeMesure(6, 0, 2)).toEqual([0, 1, 2]);
    expect(colonnesDeMesure(6, 1, 2)).toEqual([3, 4, 5]);
  });

  it('ne renvoie jamais d’index hors de la ligne', () => {
    for (const subdiv of [1, 3, 4, 5, 6, 8, 12, 16]) {
      for (const mesures of [1, 2, 4]) {
        for (let m = 0; m < mesures; m++) {
          for (const col of colonnesDeMesure(subdiv, m, mesures)) {
            expect(col).toBeGreaterThanOrEqual(0);
            expect(col).toBeLessThan(subdiv);
          }
        }
      }
    }
  });
});

describe('les 34 niveaux existants', () => {
  it('sont tous « reproduire » — la charpente n’en change aucun', () => {
    expect(LEVELS).toHaveLength(34);
    for (const l of LEVELS) expect(l.exercise).toBe('reproduire');
  });
});
