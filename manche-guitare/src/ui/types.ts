import type { ClasseNote } from '../model/types';
import type { Accent } from '../model/notes';

export interface CelluleManche {
  classe: ClasseNote;
  visible: boolean;
  libelle: string;
  accent: Accent | 'selection' | null;
  /** Hors de la position choisie : la case s'affiche en estompé. Absent ou true = pas de filtre actif. */
  dansFenetre?: boolean;
}
