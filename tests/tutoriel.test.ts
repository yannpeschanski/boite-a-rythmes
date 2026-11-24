/* Le tutoriel du premier exercice — « les gens ne savaient pas quoi faire en
 * voyant le premier écran de jeu » (2026-11-24). On avance en FAISANT : l'étape
 * se déduit de l'état, jamais d'un bouton « suivant ». */
import { describe, it, expect } from 'vitest';
import { etapeDuTutoriel, consigneDuTutoriel } from '../src/model/tutoriel';
import { ACTES, niveauxDeLActe } from '../src/model/carriere';
import { LEVELS } from '../src/model/presets/levels';

describe('le tutoriel avance sur le geste', () => {
  it('écouter, puis poser, puis vérifier', () => {
    expect(etapeDuTutoriel({ ecoutes: 0, posees: 0, attendues: 4 })).toBe(1);
    expect(etapeDuTutoriel({ ecoutes: 1, posees: 0, attendues: 4 })).toBe(2);
    expect(etapeDuTutoriel({ ecoutes: 1, posees: 3, attendues: 4 })).toBe(2);
    expect(etapeDuTutoriel({ ecoutes: 2, posees: 4, attendues: 4 })).toBe(3);
  });

  it('⚠️ poser avant d’avoir écouté ne saute pas l’écoute', () => {
    // On devine sans entendre : l'écran doit encore dire d'écouter.
    expect(etapeDuTutoriel({ ecoutes: 0, posees: 4, attendues: 4 })).toBe(1);
  });

  it('effacer une case ramène à l’étape 2 — l’étape se déduit, elle ne se retient pas', () => {
    expect(etapeDuTutoriel({ ecoutes: 1, posees: 4, attendues: 4 })).toBe(3);
    expect(etapeDuTutoriel({ ecoutes: 1, posees: 3, attendues: 4 })).toBe(2);
  });

  it('chaque consigne nomme le bouton ou le compte qu’elle demande', () => {
    expect(consigneDuTutoriel(1, { posees: 0, attendues: 4 })).toMatch(/Écouter/);
    expect(consigneDuTutoriel(2, { posees: 1, attendues: 4 })).toMatch(/1\/4/);
    expect(consigneDuTutoriel(3, { posees: 4, attendues: 4 })).toMatch(/Vérifier/);
  });

  it('le premier exercice du jeu est bien une grille à reposer — c’est ce que le tutoriel guide', () => {
    const l = LEVELS.find((x) => x.id === niveauxDeLActe(ACTES[0])[0])!;
    expect(l.exercise).toBe('reproduire');
    expect(l.grille).toBeTruthy();
  });
});
