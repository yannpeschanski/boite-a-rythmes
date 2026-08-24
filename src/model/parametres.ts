/* Les paramètres sonores, décrits une fois — pour les jeux qui les enseignent.
 *
 * Pourquoi ce fichier existe
 * --------------------------
 * Les quatre verbes du Mode jeu (`exercises.ts`) comparent des GRILLES : une
 * case est juste ou fausse. Les panneaux Timbre, Filtre & espace, Groove et
 * tout le synthé, eux, sont des VALEURS CONTINUES — trente et un boutons au
 * total. Inventer un jeu par bouton est ingérable ; ce qu'il faut, c'est un
 * petit jeu de verbes PARAMÉTRÉS par le bouton visé.
 *
 * Ce fichier est le catalogue de ces boutons : bornes, unité, et surtout les
 * deux jugements MUSICAUX que le code ne peut pas deviner —
 *   - `tolerance`  : en deçà de quel écart deux réglages s'entendent pareil ;
 *   - `ecartMini`  : au-delà de quel écart la différence s'entend à coup sûr,
 *                    donc ce qu'il faut mettre entre deux versions à comparer.
 *
 * Ces deux valeurs sont le cœur de la difficulté. Elles se règlent à l'oreille,
 * pas au calcul : les changer change le jeu.
 */

import type { DrumRowState } from './types';
import type { GameDrumRowName } from './presets/levels';

/** Les familles telles qu'elles s'appellent à l'écran, panneau par panneau. */
export type FamilleParam = 'timbre' | 'filtre' | 'groove' | 'sequence';

/* ⚠️ L'ÉCHELLE n'est pas un détail d'affichage.
 *
 * Le filtre passe-bas va de 200 à 20 000 Hz. 500 Hz d'écart à 800 Hz change le
 * son du tout au tout ; les mêmes 500 Hz à 12 kHz sont inaudibles. Une
 * tolérance exprimée en hertz serait donc absurde à un bout ou à l'autre. Les
 * paramètres logarithmiques se comparent en OCTAVES, et leur `tolerance` et leur
 * `ecartMini` s'expriment dans cette unité-là. C'est aussi vrai de l'oreille
 * pour toute fréquence — hauteur comme coupure. */
export type EchelleParam = 'lineaire' | 'log';

export interface DescripteurParam {
  /** Clé EXACTE dans `DrumRowState`. Un identifiant inventé réglerait un champ
   *  que personne ne lit : le jeu tirerait deux sons identiques et le niveau
   *  serait impossible sans que rien ne le dise. */
  id: keyof DrumRowState & string;
  /** Le libellé EXACT du curseur dans l'Atelier — le jeu et l'atelier doivent
   *  nommer la même chose de la même façon, sinon le jeu n'apprend rien
   *  d'utilisable. */
  label: string;
  famille: FamilleParam;
  min: number;
  max: number;
  step: number;
  unite: string;
  echelle: EchelleParam;
  /** Écart en deçà duquel deux réglages s'entendent pareil (unité du paramètre,
   *  ou octaves si `echelle` vaut 'log'). */
  tolerance: number;
  /** Écart à mettre entre deux versions pour que la différence soit franche. */
  ecartMini: number;
  /** Comment se dit « plus » et « moins » — pour la question de « Lequel ? ».
   *  Formulés en termes d'OREILLE, jamais de valeur : « le plus sourd » se
   *  compare, « celui à 3 000 Hz » se lit. */
  plus: string;
  moins: string;
  /** ⚠️ Les lignes où ce bouton s'entend VRAIMENT.
   *
   *  `tone` en est l'exemple : sur le kick il ne pilote qu'une saturation, donc
   *  rien en dessous de zéro (`if (tone > 0.03)`) ; sur snare et hat il décale
   *  un filtre de ±1 octave par ±50, franc dans les deux sens. Tirer un
   *  exercice sur une ligne où le bouton ne fait rien produit deux sons
   *  identiques — un niveau impossible, et muet sur la raison. */
  lignes: GameDrumRowName[];
  /* ⚠️ Sous-plage où le bouton s'entend vraiment SUR CETTE LIGNE-LÀ.
   *
   * `lignes` dit OÙ un bouton s'entend ; celui-ci dit JUSQU'OÙ. Le cas qui l'a
   * imposé est le pitch du kick : `playKick` balaie de `140 × mult` à
   * `max(20, 38 × mult)`, et ce plancher de 20 Hz écrase toute la moitié basse
   * du curseur. Mesuré dans un OfflineAudioContext réel, en RMS au-dessus de
   * 200 Hz (à peu près ce qu'un haut-parleur de téléphone restitue) :
   *
   *     pitch  −24 → 0,011   −17 → 0,015   −10 → 0,018
   *     pitch    0 → 0,027    +11 → 0,064   +24 → 0,064
   *
   * Trois versions tirées dans la moitié basse sont donc indiscernables — et
   * `tirerVersions` pouvait sortir exactement −24 / −17 / −10. C'est ce que
   * Yann a rencontré au premier niveau du jeu : « on n'arrive pas à dire si
   * c'est plus aigu ou plus grave ».
   *
   * Corrigé ICI et pas dans le moteur : le plancher de 20 Hz vient de
   * l'original et protège l'enveloppe ; c'est au JEU de ne pas poser une
   * question dont la réponse est inaudible. */
  plageParLigne?: Partial<Record<GameDrumRowName, [number, number]>>;
  /** Facteur pour écrire dans l'état ce que le curseur affiche.
   *
   *  Réverbe et Delay sont stockés en 0..1 alors que l'Atelier les montre en
   *  pourcents. Le catalogue décrit ce que le JOUEUR manipule — sans quoi les
   *  tolérances ci-dessus seraient illisibles (0,15 au lieu de 15 %) — et ce
   *  facteur fait la conversion au moment d'appliquer. */
  facteurEtat: number;
}

/* Le catalogue. Commencé par Timbre et Filtre & espace — les deux familles les
 * plus franchement audibles, et celles qui n'interagissent pas avec le
 * séquenceur. Groove, Séquence et le synthé viendront s'ajouter ici sans
 * qu'aucun verbe n'ait à changer. */
export const PARAMETRES: DescripteurParam[] = [
  // ---- Timbre ----
  {
    id: 'pitch', label: 'Pitch', famille: 'timbre',
    min: -24, max: 24, step: 1, unite: ' ½t', echelle: 'lineaire',
    // Le kick perd sa queue sous −10 (plancher de 20 Hz) : on ne le descend
    // plus en dessous de son réglage par défaut. Reste 24 demi-tons, soit
    // largement de quoi poser trois versions à 7 d'écart.
    plageParLigne: { kick: [0, 24] },
    // Un demi-ton s'entend, deux ne se discutent plus.
    tolerance: 2, ecartMini: 7,
    plus: 'le plus aigu', moins: 'le plus grave',
    lignes: ['kick', 'snare', 'hat'], facteurEtat: 1,
  },
  {
    id: 'attack', label: 'Attaque', famille: 'timbre',
    min: 0, max: 100, step: 1, unite: '', echelle: 'lineaire',
    // 0..100 correspond à 0..80 ms de montée : 12 points ≈ 10 ms.
    tolerance: 12, ecartMini: 40,
    plus: 'le plus mou à l’attaque', moins: 'le plus sec',
    lignes: ['kick', 'snare', 'hat'], facteurEtat: 1,
  },
  {
    id: 'decay', label: 'Decay', famille: 'timbre',
    min: -50, max: 50, step: 1, unite: '', echelle: 'lineaire',
    tolerance: 10, ecartMini: 35,
    plus: 'le plus long', moins: 'le plus court',
    lignes: ['kick', 'snare', 'hat'], facteurEtat: 1,
  },
  {
    id: 'tone', label: 'Tone', famille: 'timbre',
    min: -100, max: 100, step: 1, unite: '', echelle: 'lineaire',
    // ±50 déplace le filtre d'une octave : 20 points ≈ 0,4 octave.
    tolerance: 20, ecartMini: 70,
    plus: 'le plus dur', moins: 'le plus rond',
    // PAS le kick : il n'y pilote qu'une saturation, morte sous zéro.
    lignes: ['snare', 'hat'], facteurEtat: 1,
  },
  // ---- Filtre & espace ----
  {
    id: 'filterCutoff', label: 'Filtre passe-bas', famille: 'filtre',
    min: 200, max: 20000, step: 100, unite: ' Hz', echelle: 'log',
    // En OCTAVES : un tiers d'octave est la limite du discernable, deux octaves
    // ne laissent aucun doute.
    tolerance: 0.35, ecartMini: 2,
    plus: 'le plus brillant', moins: 'le plus sourd',
    lignes: ['kick', 'snare', 'hat'], facteurEtat: 1,
  },
  {
    id: 'reverbSend', label: 'Réverbe', famille: 'filtre',
    min: 0, max: 100, step: 1, unite: '%', echelle: 'lineaire',
    tolerance: 15, ecartMini: 45,
    plus: 'le plus lointain', moins: 'le plus proche',
    // Stocké en 0..1, montré en pourcents.
    lignes: ['kick', 'snare', 'hat'], facteurEtat: 0.01,
  },
  {
    id: 'delaySend', label: 'Delay', famille: 'filtre',
    min: 0, max: 100, step: 1, unite: '%', echelle: 'lineaire',
    tolerance: 15, ecartMini: 45,
    plus: 'le plus répété', moins: 'le plus net',
    lignes: ['kick', 'snare', 'hat'], facteurEtat: 0.01,
  },
];

/** Applique une valeur AFFICHÉE (celle du curseur) à l'état d'une ligne. */
export function appliquerParam(row: DrumRowState, p: DescripteurParam, valeur: number): void {
  (row[p.id] as number) = valeur * p.facteurEtat;
}

/** Relit dans l'état une valeur, dans l'unité AFFICHÉE. */
export function lireParam(row: DrumRowState, p: DescripteurParam): number {
  return (row[p.id] as number) / p.facteurEtat;
}

export function parametre(id: string): DescripteurParam | null {
  return PARAMETRES.find((p) => p.id === id) ?? null;
}

/* Le descripteur tel qu'il vaut SUR UNE LIGNE : bornes resserrées si cette
 * ligne a une sous-plage jouable (voir `plageParLigne`).
 *
 * Renvoyé plutôt qu'appliqué au moment du tirage, pour que TOUT ce qui suit
 * parle des mêmes bornes — les versions tirées, la cible de « régler », et le
 * curseur que le joueur manipule. Un curseur plus large que la plage où le son
 * bouge serait une invitation à chercher là où il n'y a rien.
 */
export function pourLigne(p: DescripteurParam, ligne: GameDrumRowName): DescripteurParam {
  const plage = p.plageParLigne?.[ligne];
  return plage ? { ...p, min: plage[0], max: plage[1] } : p;
}

export function parametresDe(famille: FamilleParam): DescripteurParam[] {
  return PARAMETRES.filter((p) => p.famille === famille);
}

/* Distance entre deux réglages, dans l'unité où l'OREILLE les compare.
 *
 * Linéaire : la différence brute. Logarithmique : le nombre d'octaves, ce qui
 * rend la mesure juste sur toute l'étendue au lieu de l'être au milieu
 * seulement. Les valeurs nulles ou négatives sont bornées avant le logarithme —
 * une fréquence de 0 Hz n'existe pas, et `Math.log2(0)` vaut -Infinity.
 */
export function ecartPercu(a: number, b: number, p: DescripteurParam): number {
  if (p.echelle === 'log') {
    const x = Math.max(1, a);
    const y = Math.max(1, b);
    return Math.abs(Math.log2(x / y));
  }
  return Math.abs(a - b);
}

/* Note 0-100 d'un réglage par rapport à sa cible.
 *
 * 100 tant qu'on est dans la tolérance — on ne demande pas de retrouver le
 * chiffre, on demande de retrouver le SON, et deux réglages indiscernables sont
 * la même réponse. Puis décroissance linéaire jusqu'à 0 à quatre fois la
 * tolérance, ce qui laisse une pente utilisable pour progresser au lieu d'un
 * tout-ou-rien.
 */
export const FACTEUR_ZERO = 4;

export function justesseDuReglage(valeur: number, cible: number, p: DescripteurParam): number {
  const d = ecartPercu(valeur, cible, p);
  if (d <= p.tolerance) return 100;
  const zero = p.tolerance * FACTEUR_ZERO;
  if (d >= zero) return 0;
  return Math.round(100 * (1 - (d - p.tolerance) / (zero - p.tolerance)));
}

/* Tire `combien` valeurs d'un paramètre, séparées d'au moins `ecartMini`.
 *
 * C'est ici que se cacherait le niveau injouable : deux versions plus proches
 * que le seuil d'audibilité posent une question dont la bonne réponse est un
 * tirage au sort, et rien à l'écran ne dirait pourquoi on n'y arrive pas.
 *
 * ⚠️ L'espacement est GARANTI PAR CONSTRUCTION, pas approché par des marges.
 * La première version découpait l'étendue en tranches et tirait dedans avec une
 * marge de 15 % : deux valeurs de tranches voisines pouvaient se retrouver à
 * 14 points l'une de l'autre pour une tolérance de 15. Le test l'a attrapé au
 * premier essai. Ici les valeurs sont posées à intervalle EXACT, et seule leur
 * position d'ensemble est tirée au hasard — le hasard décide où, jamais si
 * c'est audible.
 *
 * Tout se calcule dans l'espace où l'oreille compare : en octaves pour un
 * paramètre logarithmique, sans quoi la tranche du bas serait inaudible et
 * celle du haut énorme.
 */
export function tirerVersions(
  p: DescripteurParam,
  combien: number,
  rng: () => number = Math.random,
): number[] {
  const n = Math.max(2, combien);
  const log = p.echelle === 'log';
  const bas = log ? Math.log2(Math.max(1, p.min)) : p.min;
  const haut = log ? Math.log2(Math.max(2, p.max)) : p.max;
  const etendue = haut - bas;
  // Le plus grand écart tenable : celui qu'on veut, ou celui que l'étendue
  // permet quand on demande beaucoup de versions.
  const ecart = Math.min(p.ecartMini, etendue / (n - 1));
  const jeu = Math.max(0, etendue - ecart * (n - 1));
  const depart = bas + rng() * jeu;
  const valeurs: number[] = [];
  for (let i = 0; i < n; i++) {
    const brut = depart + i * ecart;
    valeurs.push(arrondir(log ? Math.pow(2, brut) : brut, p));
  }
  // Ordre mélangé : sans ça la bonne réponse serait toujours la dernière.
  for (let i = valeurs.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [valeurs[i], valeurs[j]] = [valeurs[j], valeurs[i]];
  }
  return valeurs;
}

/* La cible de « régler », posée LOIN du point de départ du curseur.
 *
 * ⚠️ Le bug que ça corrige, et sa forme est instructive. « Régler » tirait sa
 * cible avec `tirerVersions(p, 2)` puis gardait la première : deux valeurs bien
 * séparées l'une de l'autre — mais rien ne les séparait du MILIEU de l'étendue,
 * où le curseur du joueur commence. Une fois sur quatre environ, le niveau
 * était donc déjà gagné sans toucher au curseur. Le commentaire du store disait
 * pourtant « sinon il serait déjà juste » : l'intention était là, la garantie
 * non.
 *
 * `tests/parametres.test.ts` l'attrapait déjà — mais par une assertion
 * d'ENSEMBLE (« moins de la moitié des tirages tombent juste »), donc à la
 * frontière, donc une pièce lancée à chaque `npm test`. C'est exactement ce que
 * `CLAUDE.md` interdit : un test qui dépend du hasard doit affirmer ce qui est
 * vrai à CHAQUE tirage. Il ne pouvait pas l'affirmer, puisque ce n'était pas
 * vrai à chaque tirage.
 *
 * Ici l'écart est GARANTI PAR CONSTRUCTION, comme dans `tirerVersions` : on
 * tire la DISTANCE au départ dans `[ecartMini, étendue/2]` et le CÔTÉ, au lieu
 * de tirer une valeur et d'espérer. Le catalogue rend la chose toujours
 * possible — tous les paramètres ont `étendue ≥ 2,2 × ecartMini`, et
 * `ecartMini > 2 × tolerance`, donc une cible à `ecartMini` du départ n'est
 * jamais dans la tolérance.
 */
export function tirerCible(
  p: DescripteurParam,
  depart: number,
  rng: () => number = Math.random,
): number {
  const log = p.echelle === 'log';
  const bas = log ? Math.log2(Math.max(1, p.min)) : p.min;
  const haut = log ? Math.log2(Math.max(2, p.max)) : p.max;
  const d = log ? Math.log2(Math.max(1, depart)) : depart;

  // Ce que chaque côté peut offrir, et l'écart minimal qu'on vise.
  const place = { bas: d - bas, haut: haut - d };
  const ecart = Math.min(p.ecartMini, Math.max(place.bas, place.haut));

  // Les côtés qui tiennent l'écart ; il y en a toujours au moins un, puisque
  // `ecart` a été borné par le plus grand des deux.
  const cotes: Array<'bas' | 'haut'> = [];
  if (place.bas >= ecart) cotes.push('bas');
  if (place.haut >= ecart) cotes.push('haut');
  const cote = cotes[Math.floor(rng() * cotes.length)] ?? 'haut';

  const marge = place[cote] - ecart;
  const distance = ecart + rng() * marge;
  const brut = cote === 'bas' ? d - distance : d + distance;
  return arrondir(log ? Math.pow(2, brut) : brut, p);
}

/* ⚠️ Un paramètre logarithmique s'arrondit au hertz, PAS au pas du curseur.
 *
 * Le curseur du filtre avance par 100 Hz : près de 200 Hz, cela fait des sauts
 * de 0,35 octave, soit toute la tolérance d'un coup. Arrondir la CIBLE à ce
 * pas-là pourrait donc à lui seul rapprocher deux versions en deçà du
 * discernable. Le joueur, lui, reste libre de viser au pas de 100 Hz : la
 * tolérance est justement là pour qu'il n'ait pas à tomber sur le chiffre exact.
 */
function arrondir(v: number, p: DescripteurParam): number {
  const cale = Math.min(p.max, Math.max(p.min, v));
  if (p.echelle === 'log') return Math.round(cale);
  return Math.round(cale / p.step) * p.step;
}

/** L'index de la version qui répond à « lequel est le plus / le moins … ? ». */
export function versionQuiRepond(valeurs: number[], sens: 'plus' | 'moins'): number {
  let best = 0;
  for (let i = 1; i < valeurs.length; i++) {
    if (sens === 'plus' ? valeurs[i] > valeurs[best] : valeurs[i] < valeurs[best]) best = i;
  }
  return best;
}
