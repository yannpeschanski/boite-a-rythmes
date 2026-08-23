import { describe, it, expect } from 'vitest';
import { ACTES, NB_ACTES, ACTE_DU_MODULE, acteAVenir, acteParId, niveauxDeLActe } from '../src/model/carriere';
import { LEVELS } from '../src/model/presets/levels';
import { moduleUnlocked, LOCKED_MODULES, MODULE_UNLOCK_LEVEL } from '../src/model/unlocks';

describe('Mode carrière — la charpente en huit actes', () => {
  it('a les huit actes de HISTOIRE.md, dans l’ordre', () => {
    expect(NB_ACTES).toBe(8);
    expect(ACTES.map((a) => a.id)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(ACTES.map((a) => a.titre)).toEqual([
      'LE CAFÉ',
      'LE RYTHME',
      'LE GROOVE',
      'LA MÉLODIE',
      'LA PRODUCTION',
      'LES STYLES',
      'FB-015',
      'LE 14 JUIN',
    ]);
  });

  // Le compte à rebours est affiché en permanence, du premier écran au dernier :
  // s'il remontait, l'histoire cesserait d'avoir une échéance.
  it('a un compte à rebours strictement décroissant, qui finit à zéro', () => {
    const j = ACTES.map((a) => a.jours);
    for (let i = 1; i < j.length; i++) expect(j[i]).toBeLessThan(j[i - 1]);
    expect(j[j.length - 1]).toBe(0);
  });

  // Un acte CITE des niveaux du réservoir, il n'en fabrique pas. Une citation
  // fausse donnerait un acte injouable découvert par le joueur, pas par nous —
  // le module lève déjà au chargement, ce test dit pourquoi.
  it('ne cite que des niveaux qui existent', () => {
    const ids = new Set(LEVELS.map((l) => l.id));
    for (const a of ACTES) for (const n of niveauxDeLActe(a)) expect(ids.has(n)).toBe(true);
  });

  it('ouvre les quatre modules aux actes que dit le récit', () => {
    // HISTOIRE.md, « Ce que le récit ouvre, acte par acte ».
    expect(ACTE_DU_MODULE).toEqual({ atelier: 1, synth: 3, production: 4, live: 7 });
    // Et chaque module verrouillé est bien ouvert par un acte : un module qui
    // n'apparaîtrait nulle part dans le récit ne s'ouvrirait plus jamais par lui.
    for (const m of LOCKED_MODULES) expect(ACTE_DU_MODULE[m]).toBeTypeOf('number');
  });

  it('déclare « à venir » exactement les actes dont les exercices ne sont pas écrits', () => {
    expect(ACTES.filter((a) => !acteAVenir(a)).map((a) => a.id)).toEqual([0, 1, 2]);
  });

  // Chaque acte jouable doit contenir au moins un exercice ET au moins un
  // récit : un acte de texte seul n'est pas un jeu, un acte d'exercices seuls
  // n'est pas une histoire.
  it('alterne récit et exercices dans les actes jouables', () => {
    for (const a of ACTES.filter((x) => !acteAVenir(x))) {
      expect(a.etapes.some((e) => e.kind === 'recit')).toBe(true);
      expect(a.etapes.some((e) => e.kind === 'exercice')).toBe(true);
    }
  });

  it('borne acteParId aux actes existants', () => {
    expect(acteParId(-3).id).toBe(0);
    expect(acteParId(99).id).toBe(7);
    expect(acteParId(2).titre).toBe('LE GROOVE');
  });
});

describe('Déblocage — le récit d’abord, les niveaux en plancher', () => {
  it('n’ouvre rien à un joueur qui vient d’arriver', () => {
    const cx = { level: 1, acte: 0 };
    for (const m of LOCKED_MODULES) expect(moduleUnlocked(m, cx)).toBe(false);
  });

  // « acte » est l'acte ATTEINT : terminer l'acte 1 écrit 2, et c'est ça qui
  // ouvre l'Atelier. À 1, le joueur est DANS l'acte, il ne l'a pas fini.
  it('ouvre l’Atelier quand l’acte 1 est terminé, pas quand il commence', () => {
    expect(moduleUnlocked('atelier', { level: 1, acte: 1 })).toBe(false);
    expect(moduleUnlocked('atelier', { level: 1, acte: 2 })).toBe(true);
  });

  // La raison d'être du OU : sans lui, l'arrivée de la carrière retirerait le
  // Synthé et la Production à tous ceux qui les avaient déjà ouverts, puisque
  // les actes 3 et 4 ne sont pas encore écrits.
  it('laisse un vétéran du réservoir garder ses modules pendant qu’il fait le café', () => {
    const veteran = { level: 30, acte: 0 };
    expect(moduleUnlocked('atelier', veteran)).toBe(true);
    expect(moduleUnlocked('synth', veteran)).toBe(true);
    expect(moduleUnlocked('production', veteran)).toBe(true);
    // Le Mode Live, lui, s'ouvre au bout du réservoir : à 30, pas encore.
    expect(moduleUnlocked('live', veteran)).toBe(false);
    expect(moduleUnlocked('live', { level: MODULE_UNLOCK_LEVEL.live, acte: 0 })).toBe(true);
  });

  it('accepte un contexte sans acte (appelants d’avant la carrière)', () => {
    expect(moduleUnlocked('atelier', { level: 2 })).toBe(true);
    expect(moduleUnlocked('atelier', { level: 1 })).toBe(false);
  });
});

/* Le double curseur, vérifié par le seul scénario qui l'a rendu nécessaire :
 * relire un acte terminé. Sans lui, `ouvrirActe(1)` ferait reculer la
 * progression enregistrée — et l'Atelier, ouvert par l'acte 1, se refermerait
 * pendant qu'on relit l'acte qui vient de l'ouvrir. */
describe('Le curseur de carrière ne recule jamais', () => {
  it('avance étape par étape, puis d’acte en acte', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.setPseudo('scenario-avance');
    expect(game.progresCarriere).toEqual({ acte: 0, etape: 0 });

    const acte0 = ACTES[0];
    // Toutes les étapes sauf la dernière : on reste dans l'acte 0.
    for (let i = 0; i < acte0.etapes.length - 1; i++) {
      expect(game.avancerCarriere()).toBeNull();
      expect(game.progresCarriere.acte).toBe(0);
      expect(game.progresCarriere.etape).toBe(i + 1);
    }
    // La dernière franchie rend l'acte, et fait basculer la progression.
    expect(game.avancerCarriere()?.id).toBe(0);
    expect(game.progresCarriere).toEqual({ acte: 1, etape: 0 });
    expect(game.acteActif).toBe(1);
  });

  it('ne perd rien quand on relit un acte déjà terminé', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.setPseudo('scenario-relecture');
    const acte0 = ACTES[0];
    for (let i = 0; i < acte0.etapes.length; i++) game.avancerCarriere();
    expect(game.progresCarriere.acte).toBe(1);

    game.ouvrirActe(0);
    expect(game.acteActif).toBe(0); // on regarde l'acte 0…
    expect(game.progresCarriere.acte).toBe(1); // …mais on l'a bien dépassé.
    game.avancerCarriere();
    expect(game.progresCarriere.acte).toBe(1);
  });

  // Une étape d'exercice CHARGE son niveau : c'est le seul point de contact
  // entre le récit et le réservoir, et une erreur d'index (id vs indice) y
  // ferait jouer le niveau d'à côté sans que rien ne le signale.
  it('charge le niveau que l’étape cite', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.setPseudo('scenario-niveaux');
    // L'acte 1 n'est atteignable qu'une fois l'acte 0 derrière soi — la garde
    // d'`ouvrirActe` est délibérée : la carrière est un récit, pas un menu.
    for (let i = 0; i < ACTES[0].etapes.length; i++) game.avancerCarriere();
    game.ouvrirActe(1);
    expect(game.acteActif).toBe(1);
    const attendus = niveauxDeLActe(ACTES[1]);
    const joues: number[] = [];
    for (let i = 0; i < ACTES[1].etapes.length; i++) {
      if (game.etapeCourante?.kind === 'exercice') joues.push(game.level.id);
      game.avancerCarriere();
    }
    expect(joues).toEqual(attendus);
  });
});
