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
  ecartAuClic,
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

  /* ⚠️ Règle CHANGÉE le 2026-08-21, en connaissance de cause. L'ancienne
   * assertion était « marteler le pad fait baisser la note » : la note
   * moyennait tout le tour. Mais la boucle tourne en rond, et les tâtonnements
   * des premières mesures plombaient définitivement le résultat — on ne pouvait
   * jamais réussir UNE mesure, seulement diluer ses erreurs. C'était la vraie
   * raison pour laquelle les niveaux paraissaient impossibles. */
  it('une mesure propre suffit : les tâtonnements d’avant ne la plombent pas', () => {
    const attendues = 3;
    // Trois frappes ratées, puis trois parfaites : c'est une réussite.
    expect(justesseDesFrappes([300, 300, 300, 0, 0, 0], attendues)).toBe(100);
    // Et l'inverse aussi : on a réussi, puis on s'est relâché.
    expect(justesseDesFrappes([0, 0, 0, 300, 300, 300], attendues)).toBe(100);
  });

  it('la fenêtre est CONSÉCUTIVE : des bonnes frappes éparpillées ne suffisent pas', () => {
    // Prendre « les meilleures où qu'elles soient » récompenserait le
    // martèlement. Ici trois frappes parfaites existent, mais jamais d'affilée.
    const eparpille = justesseDesFrappes([0, 300, 0, 300, 0, 300], 3);
    const daffilee = justesseDesFrappes([0, 0, 0, 300, 300, 300], 3);
    expect(eparpille).toBeLessThan(daffilee);
    expect(eparpille).toBeLessThan(70);
  });

  it('décroît linéairement entre les deux seuils', () => {
    const milieu = (PARFAIT_MS + TOLERANCE_MS) / 2;
    expect(justesseDesFrappes([milieu], 1)).toBe(50);
  });

  it('renvoie 0 si rien n’est attendu — jamais une division par zéro', () => {
    expect(justesseDesFrappes([0, 0], 0)).toBe(0);
  });
});

describe('ecartAuClic — le calibrage, là où une erreur de signe corrigerait à l’envers', () => {
  const debut = 10;
  const pas = 0.6; // 100 bpm

  it('taper APRÈS le clic donne un écart positif', () => {
    expect(ecartAuClic(debut + 0.07, debut, pas)).toBeCloseTo(70, 6);
    // Et sur un clic plus loin dans la série, pas seulement le premier.
    expect(ecartAuClic(debut + 5 * pas + 0.07, debut, pas)).toBeCloseTo(70, 6);
  });

  it('taper AVANT le clic donne un écart négatif', () => {
    expect(ecartAuClic(debut + 3 * pas - 0.05, debut, pas)).toBeCloseTo(-50, 6);
  });

  it('pile sur le clic vaut zéro, à n’importe quel rang', () => {
    for (const n of [0, 1, 7, 11]) expect(ecartAuClic(debut + n * pas, debut, pas)).toBeCloseTo(0, 6);
  });

  it('se rattache toujours au clic le PLUS PROCHE, jamais au précédent', () => {
    // À 80 % de l’intervalle, la frappe est en avance sur le clic suivant —
    // pas en retard de 480 ms sur le précédent, ce qui la ferait passer pour
    // une aberration et fausserait la médiane.
    expect(ecartAuClic(debut + 0.8 * pas, debut, pas)).toBeCloseTo(-0.2 * pas * 1000, 6);
  });

  it('un intervalle nul ne divise pas par zéro', () => {
    expect(ecartAuClic(debut, debut, 0)).toBe(0);
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

  it('un pilote de chacun des trois verbes de PARAMÈTRE existe, en Timbre', () => {
    for (const verbe of ['lequel', 'nommer', 'regler'] as const) {
      const l = LEVELS.find((x) => x.exercise === verbe);
      expect(l, verbe).toBeDefined();
      expect(l!.familleParam, verbe).toBe('timbre');
    }
  });

  it('un pilote de chaque nouveau verbe existe', () => {
    const verbes = new Set(LEVELS.map((l) => l.exercise));
    expect(verbes.has('completer')).toBe(true);
    expect(verbes.has('intrus')).toBe(true);
    expect(verbes.has('jouer')).toBe(true);
  });
});

/* Le verbe `melodie` — une ligne de basse tirée puis comparée.
 *
 * ⚠️ La génération passe par `Math.random()` : on affirme ce qui doit être vrai
 * à CHAQUE tirage, et on répète.
 */
describe('melodie — la basse tirée tient ses promesses', () => {
  const TIRAGES = 60;

  it('commence toujours sur la tonique, et ne sort jamais de la gamme', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    for (const id of [42, 43, 44]) {
      const i = L.findIndex((l) => l.id === id);
      const m = L[i].melodie;
      for (let n = 0; n < TIRAGES; n++) {
        game.startLevel(i);
        expect(game.melodieCible.length, `niveau ${id}`).toBe(m.pas);
        // Sans point de départ, aucun degré ne se situe à l'oreille.
        expect(game.melodieCible[0], `niveau ${id}`).toBe(1);
        for (const d of game.melodieCible) {
          expect(d, `niveau ${id}`).toBeGreaterThanOrEqual(0);
          expect(d, `niveau ${id}`).toBeLessThanOrEqual(m.degreMax);
        }
        // Et il y a toujours quelque chose à trouver au-delà de la tonique.
        expect(game.melodieCible.filter((d) => d > 0).length, `niveau ${id}`).toBeGreaterThan(1);
      }
    }
  });

  it('répète vraiment la première moitié quand le niveau le promet', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    const i = L.findIndex((l) => l.id === 43);
    const moitie = L[i].melodie.pas / 2;
    for (let n = 0; n < TIRAGES; n++) {
      game.startLevel(i);
      const c = game.melodieCible;
      expect(c.slice(moitie)).toEqual(c.slice(0, moitie));
    }
  });

  // La grille de proposition part vide, et seul le comparateur la verrouille.
  it('part d’une grille vide et se valide case par case', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    game.startLevel(L.findIndex((l) => l.id === 42));
    expect(game.melodieGuess.every((v) => v === 0)).toBe(true);
    expect(game.melodieLocked.every((v) => !v)).toBe(true);

    // Une seule note juste : la vérification échoue mais verrouille la case.
    const premier = game.melodieCible.findIndex((d) => d > 0);
    game.poserNote(premier, game.melodieCible[premier]);
    expect(game.verify()).toBe(false);
    expect(game.melodieLocked[premier]).toBe(true);

    // Toutes les notes : c'est gagné.
    game.melodieCible.forEach((d, i) => d > 0 && game.poserNote(i, d));
    expect(game.verify()).toBe(true);
  });

  it('reclique un degré déjà posé pour l’effacer, et respecte le verrou', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    game.startLevel(L.findIndex((l) => l.id === 44));
    game.poserNote(3, 4);
    expect(game.melodieGuess[3]).toBe(4);
    game.poserNote(3, 4);
    expect(game.melodieGuess[3]).toBe(0);
    // Monophonique : poser un autre degré remplace, il n'y a jamais d'accord.
    game.poserNote(3, 2);
    game.poserNote(3, 6);
    expect(game.melodieGuess[3]).toBe(6);
  });
});

/* « Le silence » — le quatrième mot de l'écoute, et le seul verbe dont la
 * bonne réponse est ce qu'on n'entend PAS.
 *
 * `HISTOIRE.md` le met sur le même plan que la hauteur, la durée et
 * l'intensité ; c'est aussi celui qui casse le plus facilement en silence, au
 * sens propre : un trou masqué par une autre ligne, ou tiré sur le premier pas
 * (où il n'y a rien à manquer, la boucle n'a pas encore commencé) donne un
 * niveau sans réponse — et rien à l'écran ne le dirait.
 */
describe('silence — le trou est audible, et il en existe un', () => {
  const TIRAGES = 60;

  it('creuse toujours un trou, jamais sur le premier pas, jamais masqué', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    game.pseudo = 'test';
    const i = L.findIndex((l) => l.exercise === 'silence');
    expect(i).toBeGreaterThanOrEqual(0);
    for (let n = 0; n < TIRAGES; n++) {
      game.startLevel(i);
      const pas = game.subdiv.hat;
      // La pulsation est régulière : tous les pas sauf un.
      expect(game.target.hat.filter((v) => v > 0)).toHaveLength(pas - 1);
      expect(game.target.hat[game.silenceReponse]).toBe(0);
      // ⚠️ Jamais le premier pas : sans point de départ entendu, il n'y a rien
      // à manquer — on n'entend pas un trou avant le début.
      expect(game.silenceReponse).toBeGreaterThan(0);
      expect(game.silenceReponse).toBeLessThan(pas);
      // ⚠️ Et le kick ne tient que le premier temps : posé sur le trou, il
      // boucherait exactement ce qu'on demande d'entendre.
      expect(game.target.kick[game.silenceReponse]).toBe(0);
      expect(game.target.snare.every((v) => v === 0)).toBe(true);
    }
  });

  it('ne se gagne que sur le bon pas, et la réponse repart à vide', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    const i = L.findIndex((l) => l.exercise === 'silence');
    game.startLevel(i);
    expect(game.silenceChoix).toBeNull();
    const faux = game.silenceReponse === 1 ? 2 : 1;
    game.silenceChoix = faux;
    expect(game.verify()).toBe(false);
    game.silenceChoix = game.silenceReponse;
    expect(game.verify()).toBe(true);
    expect(game.solved).toBe(true);
  });
});
