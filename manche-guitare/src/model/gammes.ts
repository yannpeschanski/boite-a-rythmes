import type { Gamme } from './types';

/**
 * Catalogue volontairement fourni : les sept modes diatoniques, les sept
 * modes de la mineure harmonique et de la mineure mélodique (calculés par
 * rotation des intervalles de la gamme parente, puis vérifiés contre leurs
 * noms usuels), les pentatoniques/blues, quelques pentatoniques du monde,
 * les gammes symétriques et une sélection de gammes exotiques classiques.
 *
 * La gamme chromatique (les douze demi-tons) est volontairement absente :
 * elle contient par construction n'importe quel jeu de notes, donc elle
 * apparaîtrait dans CHAQUE résultat de `gammesCorrespondantes`, pour les
 * douze toniques — un bruit constant plutôt qu'une information.
 */
export const GAMMES: Gamme[] = [
  // Modes diatoniques
  { id: 'majeure', nom: 'Majeure (Ionien)', intervalles: [0, 2, 4, 5, 7, 9, 11], famille: 'Modes diatoniques' },
  { id: 'dorien', nom: 'Dorien', intervalles: [0, 2, 3, 5, 7, 9, 10], famille: 'Modes diatoniques' },
  { id: 'phrygien', nom: 'Phrygien', intervalles: [0, 1, 3, 5, 7, 8, 10], famille: 'Modes diatoniques' },
  { id: 'lydien', nom: 'Lydien', intervalles: [0, 2, 4, 6, 7, 9, 11], famille: 'Modes diatoniques' },
  { id: 'mixolydien', nom: 'Mixolydien', intervalles: [0, 2, 4, 5, 7, 9, 10], famille: 'Modes diatoniques' },
  {
    id: 'mineure-naturelle',
    nom: 'Mineure naturelle (Éolien)',
    intervalles: [0, 2, 3, 5, 7, 8, 10],
    famille: 'Modes diatoniques',
  },
  { id: 'locrien', nom: 'Locrien', intervalles: [0, 1, 3, 5, 6, 8, 10], famille: 'Modes diatoniques' },

  // Modes de la mineure harmonique
  {
    id: 'mineure-harmonique',
    nom: 'Mineure harmonique',
    intervalles: [0, 2, 3, 5, 7, 8, 11],
    famille: 'Modes de la mineure harmonique',
  },
  {
    id: 'locrien-nat6',
    nom: 'Locrien ♮6',
    intervalles: [0, 1, 3, 5, 6, 9, 10],
    famille: 'Modes de la mineure harmonique',
  },
  {
    id: 'ionien-augmente',
    nom: 'Ionien augmenté',
    intervalles: [0, 2, 4, 5, 8, 9, 11],
    famille: 'Modes de la mineure harmonique',
  },
  {
    id: 'dorien-diese4',
    nom: 'Dorien #4 (Ukrainien)',
    intervalles: [0, 2, 3, 6, 7, 9, 10],
    famille: 'Modes de la mineure harmonique',
  },
  {
    id: 'phrygien-dominant',
    nom: 'Phrygien dominant (gamme espagnole)',
    intervalles: [0, 1, 4, 5, 7, 8, 10],
    famille: 'Modes de la mineure harmonique',
  },
  {
    id: 'lydien-diese2',
    nom: 'Lydien #2',
    intervalles: [0, 3, 4, 6, 7, 9, 11],
    famille: 'Modes de la mineure harmonique',
  },
  {
    id: 'super-locrien-bb7',
    nom: 'Super Locrien bb7 (ultra-locrien)',
    intervalles: [0, 1, 3, 4, 6, 8, 9],
    famille: 'Modes de la mineure harmonique',
  },

  // Modes de la mineure mélodique
  {
    id: 'mineure-melodique',
    nom: 'Mineure mélodique',
    intervalles: [0, 2, 3, 5, 7, 9, 11],
    famille: 'Modes de la mineure mélodique',
  },
  {
    id: 'dorien-b2',
    nom: 'Dorien b2 (Phrygien ♮6)',
    intervalles: [0, 1, 3, 5, 7, 9, 10],
    famille: 'Modes de la mineure mélodique',
  },
  {
    id: 'lydien-augmente',
    nom: 'Lydien augmenté',
    intervalles: [0, 2, 4, 6, 8, 9, 11],
    famille: 'Modes de la mineure mélodique',
  },
  {
    id: 'lydien-dominant',
    nom: 'Lydien dominant (Lydien b7)',
    intervalles: [0, 2, 4, 6, 7, 9, 10],
    famille: 'Modes de la mineure mélodique',
  },
  {
    id: 'mixolydien-b6',
    nom: 'Mixolydien b6',
    intervalles: [0, 2, 4, 5, 7, 8, 10],
    famille: 'Modes de la mineure mélodique',
  },
  {
    id: 'locrien-nat2',
    nom: 'Locrien ♮2 (demi-diminuée)',
    intervalles: [0, 2, 3, 5, 6, 8, 10],
    famille: 'Modes de la mineure mélodique',
  },
  {
    id: 'alteree',
    nom: 'Altérée (super locrien)',
    intervalles: [0, 1, 3, 4, 6, 8, 10],
    famille: 'Modes de la mineure mélodique',
  },

  // Pentatoniques et blues
  {
    id: 'pentatonique-majeure',
    nom: 'Pentatonique majeure',
    intervalles: [0, 2, 4, 7, 9],
    famille: 'Pentatoniques et blues',
  },
  {
    id: 'pentatonique-mineure',
    nom: 'Pentatonique mineure',
    intervalles: [0, 3, 5, 7, 10],
    famille: 'Pentatoniques et blues',
  },
  {
    id: 'blues-mineure',
    nom: 'Blues mineure',
    intervalles: [0, 3, 5, 6, 7, 10],
    famille: 'Pentatoniques et blues',
  },
  {
    id: 'blues-majeure',
    nom: 'Blues majeure',
    intervalles: [0, 2, 3, 4, 7, 9],
    famille: 'Pentatoniques et blues',
  },

  // Pentatoniques du monde
  { id: 'hirajoshi', nom: 'Hirajoshi (Japon)', intervalles: [0, 2, 3, 7, 8], famille: 'Pentatoniques du monde' },
  { id: 'in-sen', nom: 'In Sen (Japon)', intervalles: [0, 1, 5, 7, 10], famille: 'Pentatoniques du monde' },
  { id: 'kumoi', nom: 'Kumoï (Japon)', intervalles: [0, 2, 3, 7, 9], famille: 'Pentatoniques du monde' },
  {
    id: 'egyptienne',
    nom: 'Égyptienne (suspendue)',
    intervalles: [0, 2, 5, 7, 10],
    famille: 'Pentatoniques du monde',
  },

  // Gammes symétriques
  { id: 'par-tons', nom: 'Gamme par tons', intervalles: [0, 2, 4, 6, 8, 10], famille: 'Gammes symétriques' },
  {
    id: 'diminuee-ton-demiton',
    nom: 'Diminuée ton-demiton',
    intervalles: [0, 2, 3, 5, 6, 8, 9, 11],
    famille: 'Gammes symétriques',
  },
  {
    id: 'diminuee-demiton-ton',
    nom: 'Diminuée demiton-ton (dominante)',
    intervalles: [0, 1, 3, 4, 6, 7, 9, 10],
    famille: 'Gammes symétriques',
  },
  { id: 'augmentee', nom: 'Augmentée', intervalles: [0, 3, 4, 7, 8, 11], famille: 'Gammes symétriques' },

  // Gammes exotiques
  {
    id: 'double-harmonique',
    nom: 'Double harmonique majeure (byzantine)',
    intervalles: [0, 1, 4, 5, 7, 8, 11],
    famille: 'Gammes exotiques',
  },
  {
    id: 'hongroise-mineure',
    nom: 'Mineure hongroise (tzigane)',
    intervalles: [0, 2, 3, 6, 7, 8, 11],
    famille: 'Gammes exotiques',
  },
  {
    id: 'hongroise-majeure',
    nom: 'Majeure hongroise',
    intervalles: [0, 3, 4, 6, 7, 9, 10],
    famille: 'Gammes exotiques',
  },
  {
    id: 'napolitaine-mineure',
    nom: 'Mineure napolitaine',
    intervalles: [0, 1, 3, 5, 7, 8, 11],
    famille: 'Gammes exotiques',
  },
  {
    id: 'napolitaine-majeure',
    nom: 'Majeure napolitaine',
    intervalles: [0, 1, 3, 5, 7, 9, 11],
    famille: 'Gammes exotiques',
  },
  { id: 'persane', nom: 'Persane', intervalles: [0, 1, 4, 5, 6, 8, 11], famille: 'Gammes exotiques' },
  { id: 'enigmatique', nom: 'Énigmatique', intervalles: [0, 1, 4, 6, 8, 10, 11], famille: 'Gammes exotiques' },
  { id: 'promethee', nom: 'Prométhée', intervalles: [0, 2, 4, 6, 9, 10], famille: 'Gammes exotiques' },
];

/** Ordre d'affichage des familles, dans le même ordre que le catalogue ci-dessus. */
export const FAMILLES_GAMMES = [...new Set(GAMMES.map((g) => g.famille))];
