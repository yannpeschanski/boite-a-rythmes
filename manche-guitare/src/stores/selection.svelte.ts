import type { ClasseNote, Gamme } from '../model/types';
import { GAMMES } from '../model/gammes';

/**
 * État de l'onglet Gammes : tonique + gamme choisies, et position
 * optionnelle (corde qui porte la fondamentale, pour n'afficher qu'une
 * boîte de `LARGEUR_POSITION` frettes plutôt que tout le manche).
 */
export const choixGamme = $state({
  tonique: 0 as ClasseNote,
  gamme: GAMMES[0],
  position: null as number | null,
});

/**
 * État de l'onglet Notes sur le manche : notes posées, fondamentale
 * optionnelle (pour filtrer les gammes correspondantes sur une seule
 * tonique), gamme affichée si l'utilisateur en a choisi une, et position
 * optionnelle (n'a de sens qu'une fois une gamme affichée).
 */
export const selectionManche = $state({
  notes: [] as ClasseNote[],
  fondamentale: null as ClasseNote | null,
  gammeAffichee: null as { gamme: Gamme; tonique: ClasseNote } | null,
  position: null as number | null,
});

export function basculerNote(classe: ClasseNote) {
  selectionManche.gammeAffichee = null;
  selectionManche.position = null;
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
  selectionManche.position = null;
}

export function afficherGamme(gamme: Gamme, tonique: ClasseNote) {
  selectionManche.gammeAffichee = { gamme, tonique };
  selectionManche.position = null;
}
