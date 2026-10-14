import { describe, expect, it } from 'vitest';
import {
  notesDuManche,
  grouperParCorde,
  notesDeGamme,
  degreDansGamme,
  gammesCorrespondantes,
  fretDeNote,
  fenetrePosition,
  LARGEUR_POSITION,
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
    // les douze classes de notes : la plus fournie du catalogue (diminuée) n'en compte que huit
    const toutesLesClasses = Array.from({ length: 12 }, (_, i) => i);
    const resultats = gammesCorrespondantes(toutesLesClasses);
    expect(resultats).toEqual([]);
  });

  it('avec une fondamentale imposée, ne regarde que cette tonique', () => {
    // Do-Mi-Sol correspond à Do majeur (entre autres) mais pas à Ré majeur
    const resultats = gammesCorrespondantes([0, 4, 7], undefined, 0);
    expect(resultats.every((r) => r.tonique === 0)).toBe(true);
    expect(resultats.some((r) => r.gamme.id === majeure.id)).toBe(true);
  });

  it('une fondamentale incompatible avec les notes renvoie une liste vide', () => {
    // Do-Mi-Sol ne peut pas être la gamme majeure de Ré (Ré majeur ne contient pas Do, Mi ni Sol naturels ensemble)
    const resultats = gammesCorrespondantes([0, 4, 7], [majeure], 2);
    expect(resultats).toEqual([]);
  });
});

describe('catalogue des gammes', () => {
  it('chaque gamme est triée, commence à 0 et ne contient pas de doublon', () => {
    for (const gamme of GAMMES) {
      expect(gamme.intervalles[0], `${gamme.id} doit commencer à 0`).toBe(0);
      const triee = [...gamme.intervalles].sort((a, b) => a - b);
      expect(gamme.intervalles, `${gamme.id} doit être trié`).toEqual(triee);
      expect(new Set(gamme.intervalles).size, `${gamme.id} ne doit pas avoir de doublon`).toBe(
        gamme.intervalles.length,
      );
      for (const demiTons of gamme.intervalles) {
        expect(demiTons, `${gamme.id} doit rester entre 0 et 11`).toBeGreaterThanOrEqual(0);
        expect(demiTons).toBeLessThanOrEqual(11);
      }
    }
  });

  it('chaque gamme appartient à une famille, et chaque id est unique', () => {
    for (const gamme of GAMMES) {
      expect(gamme.famille.length).toBeGreaterThan(0);
    }
    expect(new Set(GAMMES.map((g) => g.id)).size).toBe(GAMMES.length);
  });

  it('ne contient pas la gamme chromatique (elle correspondrait à tout, tout le temps)', () => {
    expect(GAMMES.some((g) => g.intervalles.length === 12)).toBe(false);
  });
});

describe('fretDeNote', () => {
  it('trouve la case où tombe la fondamentale sur une corde à vide', () => {
    // corde 0 = Mi (4) ; Mi tombe donc case 0
    expect(fretDeNote(ACCORDAGE_STANDARD, 0, 4)).toBe(0);
  });

  it('boucle correctement sur douze cases', () => {
    // corde 1 = La (9) ; Sol (7) tombe 10 cases plus loin : (7-9+12)%12 = 10
    expect(fretDeNote(ACCORDAGE_STANDARD, 1, 7)).toBe(10);
  });
});

describe('fenetrePosition', () => {
  it('centre une fenêtre de LARGEUR_POSITION cases autour de la fondamentale', () => {
    const fenetre = fenetrePosition(6, NB_CASES);
    expect(fenetre.fin - fenetre.debut + 1).toBe(LARGEUR_POSITION);
    expect(fenetre.debut).toBeLessThanOrEqual(6);
    expect(fenetre.fin).toBeGreaterThanOrEqual(6);
  });

  it('se décale sans se rétrécir près du sillet', () => {
    const fenetre = fenetrePosition(0, NB_CASES);
    expect(fenetre.debut).toBe(0);
    expect(fenetre.fin - fenetre.debut + 1).toBe(LARGEUR_POSITION);
  });

  it('se décale sans se rétrécir près de la dernière case', () => {
    const fenetre = fenetrePosition(NB_CASES, NB_CASES);
    expect(fenetre.fin).toBe(NB_CASES);
    expect(fenetre.fin - fenetre.debut + 1).toBe(LARGEUR_POSITION);
  });
});
