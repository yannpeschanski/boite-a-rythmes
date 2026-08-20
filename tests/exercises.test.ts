/* La charpente des exercices du Mode jeu.
 *
 * Le premier bloc verrouille l'ÉQUIVALENCE : la comparaison extraite du store
 * doit noter exactement comme l'ancienne boucle câblée en dur. C'est le test
 * qui rend l'extraction sûre — sans lui, « ça compile » est tout ce qu'on
 * saurait.
 */
import { describe, it, expect } from 'vitest';
import {
  comparerGrilles,
  colonnesDeTranche,
  ecartAuCoup,
  justesseDesFrappes,
  medianeDesEcarts,
  PARFAIT_MS,
  TOLERANCE_MS,
  type Grille,
  type Rafales,
} from '../src/model/exercises';
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

describe('colonnesDeTranche — chaque ligne a sa propre subdivision', () => {
  it('découpe une ligne à 8 pas en 2 tranches de 4', () => {
    expect(colonnesDeTranche(8, 0, 2)).toEqual([0, 1, 2, 3]);
    expect(colonnesDeTranche(8, 1, 2)).toEqual([4, 5, 6, 7]);
  });

  it('découpe une ligne à 6 pas (polyrythmie) sans déborder', () => {
    // 6 pas en 2 tranches : 3 par tranche, et surtout aucun index hors bornes —
    // c'est le cas que découper « au même index partout » casserait.
    expect(colonnesDeTranche(6, 0, 2)).toEqual([0, 1, 2]);
    expect(colonnesDeTranche(6, 1, 2)).toEqual([3, 4, 5]);
  });

  it('ne renvoie jamais d’index hors de la ligne', () => {
    for (const subdiv of [1, 3, 4, 5, 6, 8, 12, 16]) {
      for (const tranches of [1, 2, 4]) {
        for (let m = 0; m < tranches; m++) {
          for (const col of colonnesDeTranche(subdiv, m, tranches)) {
            expect(col).toBeGreaterThanOrEqual(0);
            expect(col).toBeLessThan(subdiv);
          }
        }
      }
    }
  });
});

describe('ecartAuCoup — en retard sur le précédent ou en avance sur le suivant', () => {
  it('juste après le coup : en retard, écart positif', () => {
    expect(ecartAuCoup(30, 500)).toBe(30);
  });

  it('juste avant le suivant : en avance, écart négatif', () => {
    expect(ecartAuCoup(470, 500)).toBe(-30);
  });

  it('le basculement se fait à la moitié, pas ailleurs', () => {
    expect(ecartAuCoup(250, 500)).toBe(250);
    expect(ecartAuCoup(251, 500)).toBe(-249);
  });
});

describe('justesseDesFrappes — ce qui distingue « au bon endroit » de « au bon moment »', () => {
  it('parfait sous le seuil d’indiscernable, nul au-delà de la tolérance', () => {
    expect(justesseDesFrappes([0, PARFAIT_MS, -PARFAIT_MS], 3)).toBe(100);
    expect(justesseDesFrappes([TOLERANCE_MS, -TOLERANCE_MS, 300], 3)).toBe(0);
  });

  it('une seule frappe très juste ne suffit pas quand trois sont attendues', () => {
    // Sans le diviseur « au moins le nombre attendu », ce serait 100 % — et
    // le niveau se gagnerait en tapant une fois puis en s’arrêtant.
    expect(justesseDesFrappes([0], 3)).toBe(33);
  });

  it('marteler le pad fait BAISSER la note, pas monter', () => {
    const propre = justesseDesFrappes([0, 0, 0], 3);
    const martele = justesseDesFrappes([0, 0, 0, 300, 300, 300], 3);
    expect(propre).toBe(100);
    expect(martele).toBeLessThan(propre);
  });

  it('décroît linéairement entre les deux seuils', () => {
    const milieu = (PARFAIT_MS + TOLERANCE_MS) / 2;
    expect(justesseDesFrappes([milieu], 1)).toBe(50);
  });

  it('renvoie 0 si rien n’est attendu — jamais une division par zéro', () => {
    expect(justesseDesFrappes([0, 0], 0)).toBe(0);
  });
});

describe('medianeDesEcarts — le diagnostic que la justesse ne donne pas', () => {
  it('sépare « tout le monde en retard » de « à côté dans les deux sens »', () => {
    // Même justesse pour les deux séries, deux problèmes différents : le
    // premier est de la latence, le second de l’imprécision.
    const traine = [60, 62, 58, 61];
    const disperse = [60, -62, 58, -61];
    expect(justesseDesFrappes(traine, 4)).toBe(justesseDesFrappes(disperse, 4));
    expect(medianeDesEcarts(traine)).toBeGreaterThan(50);
    expect(Math.abs(medianeDesEcarts(disperse))).toBeLessThan(10);
  });

  it('une frappe complètement à côté ne déplace pas le diagnostic', () => {
    // C’est la raison d’être de la médiane : la moyenne des mêmes valeurs
    // vaudrait 205.
    expect(medianeDesEcarts([10, 12, 14, 1000])).toBe(13);
  });

  it('série vide : 0, jamais NaN', () => {
    expect(medianeDesEcarts([])).toBe(0);
  });
});

describe('les niveaux', () => {
  it('la campagne reste 34 « reproduire » — ni la charpente ni les pilotes n’y touchent', () => {
    const campagne = LEVELS.slice(0, 34);
    expect(campagne).toHaveLength(34);
    for (const l of campagne) expect(l.exercise).toBe('reproduire');
  });

  it('« jouer » existe dans ses deux sens, jamais les deux à la fois', () => {
    const jouer = LEVELS.filter((l) => l.exercise === 'jouer');
    expect(jouer.map((l) => l.jouerIndice).sort()).toEqual(['ecoute', 'lecture']);
    // Le défaut ne doit pas fuiter sur les autres verbes : le champ existe
    // partout mais n'a de sens que pour « jouer ».
    for (const l of LEVELS.filter((x) => x.exercise !== 'jouer')) {
      expect(l.jouerIndice).toBe('ecoute');
    }
  });

  it('un pilote de chaque nouveau verbe existe', () => {
    const verbes = new Set(LEVELS.map((l) => l.exercise));
    expect(verbes.has('completer')).toBe(true);
    expect(verbes.has('intrus')).toBe(true);
    expect(verbes.has('jouer')).toBe(true);
  });
});
