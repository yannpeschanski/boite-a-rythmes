/** Classe de note : 0-11, 0 = Do, indépendant de l'octave. */
export type ClasseNote = number;

export interface Gamme {
  id: string;
  nom: string;
  /** Demi-tons depuis la fondamentale, triés, premier élément = 0. */
  intervalles: number[];
  /** Regroupement pour l'affichage (ex. "Modes diatoniques"). */
  famille: string;
}

export interface NoteManche {
  corde: number;
  case: number;
  classe: ClasseNote;
}
