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

/* Les champs de `PatternStateV2` (et non d'une ligne) qu'un bouton peut régler.
 * Une union nommée plutôt qu'un `string` : un identifiant inventé réglerait un
 * champ que personne ne lit, donc trois versions identiques et un niveau
 * impossible — muet sur la raison. */
export type ChampGlobalParam =
  | 'swing'
  | 'drag'
  | 'ghostDensity'
  | 'randomVelocity'
  | 'spontRoll'
  | 'globalSaturation';

export interface DescripteurParam {
  /* Clé EXACTE du champ réglé — dans `DrumRowState` pour un bouton de ligne,
   * dans l'état global pour un bouton global (voir `cible`). Un identifiant
   * inventé réglerait un champ que personne ne lit : le jeu tirerait deux sons
   * identiques et le niveau serait impossible sans que rien ne le dise. C'est
   * l'union qui garde cette garantie, pas un `string` libre. */
  id: (keyof DrumRowState | ChampGlobalParam) & string;
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
  /** Même idée, mais sur TOUTES les lignes — un bouton dont une partie de
   *  l'étendue ne pose pas de question valable où qu'on le joue. Le volume en
   *  est l'exemple : tiré près de zéro, la « version » est un silence. */
  plageJeu?: [number, number];
  /* ⚠️ Où ce bouton s'écrit : dans la LIGNE, ou dans l'état global.
   *
   * Swing et traîne ne sont pas des champs de `DrumRowState` — ils vivent sur
   * `PatternStateV2` et valent pour tout le kit. Sans cette distinction, un
   * exercice de groove écrirait dans un champ inexistant et ferait entendre
   * deux fois le même son. */
  cible?: 'ligne' | 'global';
  /* ⚠️ Ce qu'il faut FAIRE SONNER pour que ce bouton s'entende.
   *
   * Les boutons de timbre s'entendent sur une note isolée ; ceux de groove,
   * non — et c'est mesurable dans le scheduler :
   *
   * - le **swing** ne décale que les pas IMPAIRS (`col % 2 === 1`). Le motif
   *   par défaut des exercices pose les notes sur [0, 2, 4, 6], tous pairs :
   *   le swing n'aurait strictement aucun effet. D'où `pas` en croches.
   * - le **décalage** est par ligne, donc il ne s'entend que CONTRE quelque
   *   chose qui ne bouge pas. D'où `repere`, une seconde ligne qui sonne. */
  contexte?: {
    /** Les pas où poser une note sur la ligne visée. Défaut : [0, 2, 4, 6]. */
    pas?: number[];
    /** Une ligne qui sonne en plus, jamais visée : le point fixe. */
    repere?: GameDrumRowName;
  };
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
  {
    /* L'INTENSITÉ — le troisième des quatre mots de l'acte 0 (« la hauteur ; la
     * durée ; l'intensité ; le silence »). Il manquait au catalogue alors que
     * le champ existe depuis toujours. */
    id: 'volume', label: 'Volume', famille: 'timbre',
    min: 0, max: 100, step: 1, unite: ' %', echelle: 'lineaire',
    tolerance: 10, ecartMini: 30,
    // ⚠️ Jamais sous 30 % : tiré près de zéro, la version à comparer est un
    // silence, et « laquelle est la plus forte ? » se répond sans écouter.
    plageJeu: [30, 100],
    plus: 'le plus fort', moins: 'le plus doux',
    lignes: ['kick', 'snare', 'hat'], facteurEtat: 0.01,
  },

  /* ---- Groove ----
   *
   * ⚠️ La famille était DÉCLARÉE et vide. Deux boutons seulement y entrent, et
   * l'absent est instructif : **la traîne n'est pas enseignable**. Elle est
   * globale et décale TOUT uniformément — deux boucles solo séparées d'un
   * retard constant sont indiscernables, il n'y a rien contre quoi l'entendre.
   * La mettre ici donnerait une question dont la réponse est un tirage au sort.
   */
  {
    id: 'swing', label: 'Swing', famille: 'groove', cible: 'global',
    min: 0, max: 75, step: 1, unite: ' %', echelle: 'lineaire',
    // Le swing s'entend franchement : 10 % se sent, 20 contre 45 ne se discute
    // pas. En dessous de 8 points, deux réglages balancent pareil.
    tolerance: 8, ecartMini: 22,
    plus: 'le plus balancé', moins: 'le plus carré',
    lignes: ['hat'], facteurEtat: 1,
    // Croches sur les huit pas : le swing ne retarde que les pas IMPAIRS, un
    // motif en noires ne bougerait pas d'un cheveu. Le kick tient le temps.
    contexte: { pas: [0, 1, 2, 3, 4, 5, 6, 7], repere: 'kick' },
  },
  {
    id: 'shiftPct', label: 'Décalage', famille: 'groove',
    min: -50, max: 50, step: 1, unite: ' %', echelle: 'lineaire',
    tolerance: 8, ecartMini: 22,
    plus: 'le plus en retard', moins: 'le plus en avance',
    lignes: ['hat'], facteurEtat: 1,
    // Un décalage ne s'entend que CONTRE un point fixe : sans le kick, la
    // ligne décalée sonne simplement comme une ligne à l'heure.
    contexte: { repere: 'kick' },
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

  /* ---- Ce qui bouge tout seul, et le grain ----------------------------
   *
   * ⚠️ Quatre boutons GLOBAUX ajoutés le 2026-08-31, et chacun a été mesuré
   * DANS LE CONTEXTE RÉEL d'un exercice de paramètre — une seule ligne posée
   * sur [0, 2, 4, 6] plus un repère, pas un kit complet. Mesurer sur un kit
   * dirait qu'un bouton s'entend là où le jeu ne le fait pas entendre.
   *
   * Deux candidats ont été ÉCARTÉS par la mesure, et c'est le principal
   * résultat de cette passe :
   *   - `globalCompression` : l'écart au réglage bas n'est pas monotone (mi-
   *     chemin 0,67 contre 0,48 au maximum, mesuré deux fois dans deux
   *     contextes). « Lequel est le plus compressé ? » n'aurait pas de réponse
   *     fiable ;
   *   - `globalBitcrush` : même défaut, en moins net.
   * Un bouton dont l'effet n'est pas monotone ne peut pas porter « le plus… ».
   */
  {
    id: 'ghostDensity', label: 'Ghost notes', famille: 'groove', cible: 'global',
    min: 0, max: 40, step: 1, unite: ' %', echelle: 'lineaire',
    /* Mesuré en rejouant le scheduler, 40 graines : 14 événements et un écart
     * de gain de 0,048 à zéro ; 15,3 et 0,158 à 20 ; 16,7 et 0,218 à 40.
     * Monotone sur les deux. La moitié basse porte l'essentiel du changement,
     * d'où une tolérance serrée. */
    tolerance: 6, ecartMini: 16,
    plus: 'le plus fourmillant', moins: 'le plus net',
    /* ⚠️ La claire SEULE : les ghost notes tombent sur `state.ghostRow`, qui
     * vaut « snare » par défaut. Tirées sur une autre ligne, elles sonneraient
     * ailleurs que là où le jeu fait écouter — donc trois versions identiques. */
    lignes: ['snare'], facteurEtat: 1,
    /* Le repère est celui avec lequel la mesure a été faite : une ligne qui
     * sonne à côté, sur les temps. Sans lui, le bouton s'entendrait dans le
     * vide — et surtout, le jeu ne ferait pas entendre ce qui a été mesuré. */
    contexte: { repere: 'kick' },
  },
  {
    id: 'randomVelocity', label: 'Vélocité aléatoire', famille: 'groove', cible: 'global',
    min: 0, max: 100, step: 1, unite: ' %', echelle: 'lineaire',
    /* Le nombre de coups ne bouge pas — c'est leur FORCE qui varie : écart de
     * gain 0,048 → 0,089 → 0,157 pour 0 / 50 / 100. Monotone. */
    tolerance: 12, ecartMini: 35,
    plus: 'le plus vivant', moins: 'le plus mécanique',
    lignes: ['kick', 'snare', 'hat'], facteurEtat: 1,
    /* Le repère est celui avec lequel la mesure a été faite : une ligne qui
     * sonne à côté, sur les temps. Sans lui, le bouton s'entendrait dans le
     * vide — et surtout, le jeu ne ferait pas entendre ce qui a été mesuré. */
    contexte: { repere: 'kick' },
  },
  {
    id: 'spontRoll', label: 'Rafales spontanées', famille: 'groove', cible: 'global',
    min: 0, max: 100, step: 1, unite: ' %', echelle: 'lineaire',
    /* 14 → 22,6 → 32,1 événements pour 0 / 50 / 100 : le bouton double le
     * nombre de frappes. C'est le plus franc des trois. */
    tolerance: 12, ecartMini: 35,
    plus: 'le plus bavard', moins: 'le plus sobre',
    /* ⚠️ LE CHARLEY, ET RIEN D'AUTRE — mesuré, pas supposé. `scheduler.ts` ne
     * consulte `spontRoll` que dans la voie du hat : sur la caisse claire, 0 et
     * 100 donnent exactement 14 événements et le même écart de gain. Déclaré
     * ailleurs, ce bouton aurait posé trois versions identiques. C'est le cas
     * d'école du champ `lignes`. */
    lignes: ['hat'], facteurEtat: 1,
    /* Le repère est celui avec lequel la mesure a été faite : une ligne qui
     * sonne à côté, sur les temps. Sans lui, le bouton s'entendrait dans le
     * vide — et surtout, le jeu ne ferait pas entendre ce qui a été mesuré. */
    contexte: { repere: 'kick' },
  },
  {
    id: 'globalSaturation', label: 'Saturation', famille: 'timbre', cible: 'global',
    min: 0, max: 100, step: 1, unite: ' %', echelle: 'lineaire',
    /* Le plus franc de tous : rendu hors ligne, l'écart RMS entre 0 et 100 vaut
     * 2,7 fois le RMS du morceau lui-même. Il passe par le bus de batterie,
     * donc il s'entend quelle que soit la ligne. */
    tolerance: 10, ecartMini: 30,
    plus: 'le plus sale', moins: 'le plus propre',
    lignes: ['kick', 'snare', 'hat'], facteurEtat: 1,
    /* Le repère est celui avec lequel la mesure a été faite : une ligne qui
     * sonne à côté, sur les temps. Sans lui, le bouton s'entendrait dans le
     * vide — et surtout, le jeu ne ferait pas entendre ce qui a été mesuré. */
    contexte: { repere: 'kick' },
  },
];

/** Applique une valeur AFFICHÉE (celle du curseur) à l'état d'une ligne. */
export function appliquerParam(row: DrumRowState, p: DescripteurParam, valeur: number): void {
  (row as unknown as Record<string, number>)[p.id] = valeur * p.facteurEtat;
}

/* Les paramètres GLOBAUX (swing) ne vivent pas dans une ligne mais sur l'état.
 * Deux fonctions plutôt qu'une qui prendrait tout l'état : chacune dit dans son
 * nom où elle écrit, et l'appelant doit avoir lu `p.cible` pour choisir. */
export function appliquerParamGlobal(
  state: Record<ChampGlobalParam, number>,
  p: DescripteurParam,
  valeur: number,
): void {
  (state as unknown as Record<string, number>)[p.id] = valeur * p.facteurEtat;
}

/** Relit dans l'état une valeur, dans l'unité AFFICHÉE. */
export function lireParam(row: DrumRowState, p: DescripteurParam): number {
  return (row as unknown as Record<string, number>)[p.id] / p.facteurEtat;
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
  const plage = p.plageParLigne?.[ligne] ?? p.plageJeu;
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
