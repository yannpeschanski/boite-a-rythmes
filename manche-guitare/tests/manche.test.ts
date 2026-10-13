import { describe, expect, it } from 'vitest';
import {
  notesDuManche,
  grouperParCorde,
  notesDeGamme,
  degreDansGamme,
  gammesCorrespondantes,
} from '../src/engine/manche';
import { GAMMES } from '../src/model/gammes';
import { ACCORDAGE_STANDARD, NB_CASES } from '../src/model/accordage';

const majeure = GAMMES.find((g) => g.id === 'majeure')!;

describe('notesDuManche', () => {
  it('couvre toutes les cordes et toutes les cases, corde à vide incluse', () => {
    const notes = notesDuManche(ACCORDAGE_STANDARD, NB_CASES);
    expect(notes).toHaveLength(ACCORDAGE_STANDARD.length * (NB_CASES + 1));
    expect(notes[0]).toEqual({ corde: 0, case: 0, classe: 4 });
  });

  it('boucle les classes de notes modulo 12', () => {
    const notes = notesDuManche([11], 1);
    expect(notes[1].classe).toBe(0);
  });
});

describe('grouperParCorde', () => {
  it('reconstitue une grille indexée par corde puis par case', () => {
    const notes = notesDuManche(ACCORDAGE_STANDARD, NB_CASES);
    const grille = grouperParCorde(notes, ACCORDAGE_STANDARD.length);
    expect(grille).toHaveLength(ACCORDAGE_STANDARD.length);
    expect(grille[2][0].classe).toBe(ACCORDAGE_STANDARD[2]);
    expect(grille[2]).toHaveLength(NB_CASES + 1);
  });
});

describe('notesDeGamme', () => {
  it('donne les sept notes de la gamme majeure de Do', () => {
    expect(notesDeGamme(0, majeure)).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });
});

describe('degreDansGamme', () => {
  it('reconnaît la fondamentale', () => {
    expect(degreDansGamme(0, 0, majeure)).toBe(0);
  });

  it('rejette une note hors gamme', () => {
    expect(degreDansGamme(1, 0, majeure)).toBeNull();
  });

  it('fonctionne sur une tonique non nulle (Sol majeur contient Fa# en septième majeure)', () => {
    expect(degreDansGamme(6, 7, majeure)).toBe(11);
  });
});

describe('gammesCorrespondantes', () => {
  it('ne retourne rien sans note sélectionnée', () => {
    expect(gammesCorrespondantes([])).toEqual([]);
  });

  it('trouve Do majeur à partir de ses sept notes', () => {
    const resultats = gammesCorrespondantes([0, 2, 4, 5, 7, 9, 11]);
    expect(resultats.some((r) => r.gamme.id === majeure.id && r.tonique === 0)).toBe(true);
  });

  it('une seule note correspond à plusieurs gammes', () => {
    const resultats = gammesCorrespondantes([0]);
    expect(resultats.length).toBeGreaterThan(1);
  });

  it('un jeu de notes incompatible avec le catalogue ne renvoie rien', () => {
    // les douze classes de notes : aucune gamme du catalogue n'en compte plus de sept
    const toutesLesClasses = Array.from({ length: 12 }, (_, i) => i);
    const resultats = gammesCorrespondantes(toutesLesClasses);
    expect(resultats).toEqual([]);
  });
});
