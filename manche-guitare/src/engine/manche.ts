import type { ClasseNote, Gamme, NoteManche } from '../model/types';
import { GAMMES } from '../model/gammes';

function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

/** Liste, corde par corde et case par case (case 0 = corde à vide), la classe de note jouée. */
export function notesDuManche(accordage: ClasseNote[], nbCases: number): NoteManche[] {
  const notes: NoteManche[] = [];
  for (let corde = 0; corde < accordage.length; corde++) {
    for (let caseIdx = 0; caseIdx <= nbCases; caseIdx++) {
      notes.push({ corde, case: caseIdx, classe: mod12(accordage[corde] + caseIdx) });
    }
  }
  return notes;
}

/** Regroupe une liste à plat de notes du manche par corde, dans l'ordre des cases. */
export function grouperParCorde(notes: NoteManche[], nbCordes: number): NoteManche[][] {
  const grille: NoteManche[][] = Array.from({ length: nbCordes }, () => []);
  for (const note of notes) {
    grille[note.corde].push(note);
  }
  return grille;
}

export function notesDeGamme(tonique: ClasseNote, gamme: Gamme): ClasseNote[] {
  return gamme.intervalles.map((i) => mod12(tonique + i));
}

/** Demi-tons depuis la tonique si la classe appartient à la gamme, sinon null. */
export function degreDansGamme(classe: ClasseNote, tonique: ClasseNote, gamme: Gamme): number | null {
  const demiTons = mod12(classe - tonique);
  return gamme.intervalles.includes(demiTons) ? demiTons : null;
}

export interface Correspondance {
  gamme: Gamme;
  tonique: ClasseNote;
}

/**
 * Gammes du catalogue qui contiennent exactement les classes de notes données,
 * pour une tonique quelconque (0-11). Vide tant qu'aucune note n'est sélectionnée.
 */
export function gammesCorrespondantes(
  notesSelectionnees: ClasseNote[],
  catalogue: Gamme[] = GAMMES,
): Correspondance[] {
  if (notesSelectionnees.length === 0) return [];
  const resultats: Correspondance[] = [];
  for (let tonique = 0; tonique < 12; tonique++) {
    for (const gamme of catalogue) {
      const ensemble = new Set(gamme.intervalles);
      const correspond = notesSelectionnees.every((classe) => ensemble.has(mod12(classe - tonique)));
      if (correspond) resultats.push({ gamme, tonique });
    }
  }
  return resultats;
}
