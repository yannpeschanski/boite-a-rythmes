import type { ClasseNote, Gamme } from '../model/types';
import { GAMMES } from '../model/gammes';

/** État de l'onglet Gammes : tonique + gamme choisies. */
export const choixGamme = $state({
  tonique: 0 as ClasseNote,
  gamme: GAMMES[0],
});

/**
 * État de l'onglet Notes sur le manche : notes posées, fondamentale
 * optionnelle (pour filtrer les gammes correspondantes sur une seule
 * tonique) et gamme affichée si l'utilisateur en a choisi une.
 */
export const selectionManche = $state({
  notes: [] as ClasseNote[],
  fondamentale: null as ClasseNote | null,
  gammeAffichee: null as { gamme: Gamme; tonique: ClasseNote } | null,
});

export function basculerNote(classe: ClasseNote) {
  selectionManche.gammeAffichee = null;
  const index = selectionManche.notes.indexOf(classe);
  if (index === -1) {
    selectionManche.notes.push(classe);
  } else {
    selectionManche.notes.splice(index, 1);
    // Une fondamentale ne peut pas pointer vers une note qu'on vient de retirer.
    if (selectionManche.fondamentale === classe) {
      selectionManche.fondamentale = null;
    }
  }
}

export function definirFondamentale(classe: ClasseNote | null) {
  selectionManche.fondamentale = classe;
}

export function reinitialiserSelection() {
  selectionManche.notes = [];
  selectionManche.fondamentale = null;
  selectionManche.gammeAffichee = null;
}

export function afficherGamme(gamme: Gamme, tonique: ClasseNote) {
  selectionManche.gammeAffichee = { gamme, tonique };
}
