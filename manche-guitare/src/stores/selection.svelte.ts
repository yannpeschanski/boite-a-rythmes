import type { ClasseNote, Gamme } from '../model/types';
import { GAMMES } from '../model/gammes';

/** État de l'onglet Gammes : tonique + gamme choisies. */
export const choixGamme = $state({
  tonique: 0 as ClasseNote,
  gamme: GAMMES[0],
});

/** État de l'onglet Notes sur le manche : notes posées, et gamme affichée si l'utilisateur en a choisi une. */
export const selectionManche = $state({
  notes: [] as ClasseNote[],
  gammeAffichee: null as { gamme: Gamme; tonique: ClasseNote } | null,
});

export function basculerNote(classe: ClasseNote) {
  selectionManche.gammeAffichee = null;
  const index = selectionManche.notes.indexOf(classe);
  if (index === -1) {
    selectionManche.notes.push(classe);
  } else {
    selectionManche.notes.splice(index, 1);
  }
}

export function reinitialiserSelection() {
  selectionManche.notes = [];
  selectionManche.gammeAffichee = null;
}

export function afficherGamme(gamme: Gamme, tonique: ClasseNote) {
  selectionManche.gammeAffichee = { gamme, tonique };
}
