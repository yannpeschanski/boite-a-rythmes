import type { ClasseNote } from './types';

export const NOMS_NOTES = [
  'Do',
  'Do#',
  'Ré',
  'Ré#',
  'Mi',
  'Fa',
  'Fa#',
  'Sol',
  'Sol#',
  'La',
  'La#',
  'Si',
] as const;

function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

export function nomNote(classe: ClasseNote): string {
  return NOMS_NOTES[mod12(classe)];
}

const LIBELLES_DEGRES = [
  'Fondamentale',
  'Seconde mineure',
  'Seconde majeure',
  'Tierce mineure',
  'Tierce majeure',
  'Quarte',
  'Quinte diminuée',
  'Quinte',
  'Sixte mineure',
  'Sixte majeure',
  'Septième mineure',
  'Septième majeure',
] as const;

export function libelleDegre(demiTons: number): string {
  return LIBELLES_DEGRES[mod12(demiTons)];
}

export type Accent = 'fondamentale' | 'tierce' | 'quinte' | 'autre';

/** Regroupe un degré (0-11 demi-tons depuis la fondamentale) pour l'affichage : on distingue la fondamentale, la tierce et la quinte, le reste est "autre". */
export function accentDuDegre(demiTons: number): Accent {
  const d = mod12(demiTons);
  if (d === 0) return 'fondamentale';
  if (d === 3 || d === 4) return 'tierce';
  if (d === 6 || d === 7) return 'quinte';
  return 'autre';
}
