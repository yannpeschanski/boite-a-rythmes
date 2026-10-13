import type { ClasseNote } from '../model/types';
import type { Accent } from '../model/notes';

export interface CelluleManche {
  classe: ClasseNote;
  visible: boolean;
  libelle: string;
  accent: Accent | 'selection' | null;
}
