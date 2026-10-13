import type { Gamme } from './types';

export const GAMMES: Gamme[] = [
  { id: 'majeure', nom: 'Majeure (Ionien)', intervalles: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'mineure-naturelle', nom: 'Mineure naturelle (Éolien)', intervalles: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'mineure-harmonique', nom: 'Mineure harmonique', intervalles: [0, 2, 3, 5, 7, 8, 11] },
  { id: 'mineure-melodique', nom: 'Mineure mélodique', intervalles: [0, 2, 3, 5, 7, 9, 11] },
  { id: 'dorien', nom: 'Dorien', intervalles: [0, 2, 3, 5, 7, 9, 10] },
  { id: 'phrygien', nom: 'Phrygien', intervalles: [0, 1, 3, 5, 7, 8, 10] },
  { id: 'lydien', nom: 'Lydien', intervalles: [0, 2, 4, 6, 7, 9, 11] },
  { id: 'mixolydien', nom: 'Mixolydien', intervalles: [0, 2, 4, 5, 7, 9, 10] },
  { id: 'locrien', nom: 'Locrien', intervalles: [0, 1, 3, 5, 6, 8, 10] },
  { id: 'pentatonique-majeure', nom: 'Pentatonique majeure', intervalles: [0, 2, 4, 7, 9] },
  { id: 'pentatonique-mineure', nom: 'Pentatonique mineure', intervalles: [0, 3, 5, 7, 10] },
  { id: 'blues-mineur', nom: 'Blues mineur', intervalles: [0, 3, 5, 6, 7, 10] },
];
