/* LES ROASTS — ce qu'on dit au joueur, et ce qu'on ne peut PAS lui dire.
 *
 * Retour de Yann (2026-09-04) : *« il faut revoir les roasts pour que ça
 * corresponde à l'exercice réalisé. Le système avait été défini sur un de
 * reproduction de rythme uniquement. »*
 *
 * Deux des trois axes d'origine mentaient sur la moitié du jeu, et aucun test
 * ne pouvait le voir : le calcul vivait dans le store, entre un `voiceTier` et
 * deux compteurs mis à jour par la vue. Il est PUR maintenant, donc tenable.
 */
import { describe, it, expect } from 'vitest';
import {
  ROAST_VERBE,
  ROAST_ESSAIS,
  ROAST_COMPARAISONS,
  composerRoast,
  type MesuresDuTour,
} from '../src/model/presets/gameData';
import { LEVELS } from '../src/model/presets/levels';
import type { ExerciseKind } from '../src/model/exercises';

/** Toutes les phrases qu'un roast peut contenir, quel que soit le tirage. */
function toutesLesPhrases(verbe: ExerciseKind, m: MesuresDuTour): string[] {
  const vues: string[] = [];
  // On force le tirage à parcourir chaque case plutôt que de répéter au hasard.
  for (let i = 0; i < 12; i++) {
    vues.push(composerRoast(verbe, m, (a) => a[i % a.length]));
  }
  return vues;
}

const AUCUNE_MESURE: MesuresDuTour = { attempts: 1, loopPlays: 0, guessPlays: 0, paramEcoutes: 0 };

describe('chaque verbe a sa réplique', () => {
  it('les douze verbes du jeu sont couverts', () => {
    const verbes = [...new Set(LEVELS.map((l) => l.exercise))];
    expect(verbes.length).toBe(12);
    for (const v of verbes) {
      expect(ROAST_VERBE[v], v).toBeDefined();
      expect(ROAST_VERBE[v].length, v).toBeGreaterThanOrEqual(3);
    }
  });

  it('et aucune réplique n’est vide', () => {
    for (const [v, lignes] of Object.entries(ROAST_VERBE)) {
      for (const l of lignes) expect(l.trim().length, v).toBeGreaterThan(10);
    }
  });
});

/* ⚠️ LE DÉFAUT D'ORIGINE, gravé. `voiceTier: 'hard'` couvre 51 niveaux de
 * DOUZE verbes ; sa réplique annonçait « DIFFICILE, avec de la polyrythmie »
 * sur un exercice de vocabulaire, de style ou de laverie. Un roast ne parle
 * plus d'une propriété musicale que le niveau ne porte pas. */
describe('⚠️ un roast ne cite pas ce que l’exercice ne contient pas', () => {
  it('personne ne parle de polyrythmie', () => {
    const fautifs = Object.entries(ROAST_VERBE)
      .flatMap(([v, lignes]) => lignes.filter((l) => /polyrythm/i.test(l)).map((l) => `${v} : ${l}`))
      .concat(
        Object.values(ROAST_ESSAIS)
          .flat()
          .filter((l) => /polyrythm/i.test(l)),
      );
    expect(fautifs).toEqual([]);
  });

  /* Les verbes de PARAMÈTRE n'ont pas de « version à soi » : leur écran ne
   * propose que des versions à comparer. Une réplique qui parle de « ta
   * version » y est fausse. */
  it('on ne parle de « ta version » qu’aux verbes qui en ont une', () => {
    for (const v of ['lequel', 'nommer', 'regler', 'laverie', 'style'] as ExerciseKind[]) {
      for (const phrase of ROAST_VERBE[v]) {
        expect(/ta (propre )?version/i.test(phrase), `${v} : ${phrase}`).toBe(false);
      }
    }
  });
});

describe('un roast ne commente que ce qui a été MESURÉ', () => {
  it('sans écoute comptée, il se tait plutôt que d’inventer', () => {
    for (const texte of toutesLesPhrases('regler', AUCUNE_MESURE)) {
      expect(/écoute|boucle a tourné|réécout|compar/i.test(texte), texte).toBe(false);
    }
  });

  /* Le cœur du correctif : un verbe de paramètre parle de COMPARAISONS, jamais
   * d'une boucle cible ni d'une version à soi — ses deux compteurs restent à
   * zéro parce que son écran ne les alimente pas. */
  it('⚠️ un verbe de paramètre parle de comparaisons, pas de boucle', () => {
    const m = { attempts: 2, loopPlays: 0, guessPlays: 0, paramEcoutes: 5 };
    const textes = toutesLesPhrases('lequel', m);
    expect(textes.some((t) => /compar|versions/i.test(t))).toBe(true);
    for (const t of textes) expect(/ta propre version/i.test(t), t).toBe(false);
  });

  it('un verbe de grille garde ses écoutes', () => {
    const m = { attempts: 1, loopPlays: 4, guessPlays: 0, paramEcoutes: 0 };
    expect(toutesLesPhrases('reproduire', m).some((t) => /boucle|écout/i.test(t))).toBe(true);
  });

  it('et la réécoute de sa version prime sur le compte de boucles', () => {
    const m = { attempts: 1, loopPlays: 4, guessPlays: 2, paramEcoutes: 0 };
    for (const t of toutesLesPhrases('reproduire', m)) {
      expect(/réécout|vérifié ta propre version|contrôle qualité/i.test(t), t).toBe(true);
    }
  });
});

describe('les essais sont le seul axe vrai partout', () => {
  it('ils sont cités quel que soit le verbe', () => {
    const verbes = [...new Set(LEVELS.map((l) => l.exercise))];
    for (const v of verbes) {
      const t = composerRoast(v, AUCUNE_MESURE, (a) => a[0]);
      expect(t.includes(ROAST_ESSAIS['1'][0]), v).toBe(true);
    }
  });

  it('et les trois paliers existent', () => {
    for (const k of ['1', '2', '3']) {
      expect(ROAST_ESSAIS[k].length, k).toBeGreaterThanOrEqual(3);
      expect(ROAST_COMPARAISONS[k].length, k).toBeGreaterThanOrEqual(3);
    }
  });
});
