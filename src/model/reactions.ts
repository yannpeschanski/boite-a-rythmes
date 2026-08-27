/* Ce que le jeu DIT du morceau qu'on vient de livrer.
 *
 * ⚠️ Pourquoi ce module existe, et ce qu'il remplace. Jusqu'ici, livrer une
 * commande affichait une phrase écrite d'avance (`EtapeCommande.accepte`) —
 * la même quel que soit le morceau. Et les « roasts » de `gameData.ts`, eux,
 * commentent la FAÇON DE JOUER : la difficulté choisie, le nombre de
 * réécoutes, les tours de boucle. Aucun des deux ne regarde la production.
 *
 * Retour de Yann (2026-08-27) : *« ce serait particulièrement intéressant si
 * le jeu pouvait réellement analyser ce que l'on vient de faire pour adapter
 * sa réaction. Cela donnerait l'impression que le jeu écoute véritablement
 * notre production. »* Son exemple, repris ici mot pour mot : une commande qui
 * demandait une basse, livrée avec deux notes → « Ah… service minimum sur la
 * basse. »
 *
 * QUATRE RÈGLES, et elles sont le module :
 *
 * 1. **Une réaction cite un FAIT de l'état.** Pas une humeur, pas une
 *    généralité : une propriété qu'on peut lire dans `PatternStateV2` et
 *    vérifier dans un test. C'est la seule différence entre « le jeu écoute »
 *    et un roast de plus.
 *
 * 2. **On ne commente QUE ce qui est audible.** Une ligne coupée ou vide ne
 *    sonne pas ; en parler, c'est précisément ne pas écouter. Toutes les
 *    observations passent donc par `lignesAudibles`.
 *
 * 3. **Le poids est la SPÉCIFICITÉ, jamais la sévérité.** Si les piques
 *    pesaient plus lourd que les compliments, le jeu ne ferait que se moquer,
 *    et une bonne production recevrait la même pique qu'une bâclée. Ce qui
 *    gagne, c'est ce qui est le plus PRÉCIS sur ce morceau-là : « ta basse
 *    fait deux notes » bat « c'est un peu rapide », dans les deux sens.
 *
 * 4. **Rien à dire → on ne dit rien.** Pas de ligne de remplissage. Une
 *    réaction générique après une livraison est exactement ce qu'on cherche à
 *    supprimer : elle apprend au joueur que le jeu ne regarde pas.
 */
import type { PatternStateV2, DrumRowName, SynthRowName, SynthStep } from './types';

export type TonReaction = 'pique' | 'compliment';

export interface Observation {
  id: string;
  /** Ce qui doit être VRAI du morceau pour que la réplique ait un sens. */
  tient: (e: PatternStateV2) => boolean;
  /* Ce que le personnage dit. PLUSIEURS formulations pour la même
   * observation : c'est la seule variation qu'on s'autorise, et elle est
   * gratuite. Le choix de l'observation, lui, reste déterministe — c'est ce
   * qui fait que le jeu écoute. Deux morceaux identiques reçoivent la même
   * remarque, formulée différemment ; deux morceaux différents en reçoivent
   * deux différentes. */
  lignes: string[];
  /** La SPÉCIFICITÉ de l'observation (voir règle 3), pas sa sévérité. */
  poids: number;
  ton: TonReaction;
}

/* ---------- Lire l'état ---------- */

const DRUMS: DrumRowName[] = ['kick', 'snare', 'hat', 'clap', 'shaker'];
const SYNTHS: SynthRowName[] = ['bass', 'pad', 'melody'];

/** Les coups posés sur une ligne de batterie, dans sa subdivision réelle. */
function coups(e: PatternStateV2, l: DrumRowName): number {
  const r = e.rows[l];
  return r.pattern.slice(0, r.subdiv).filter((v) => v > 0).length;
}

/** Une ligne de batterie qu'on ENTEND : pas coupée, et qui a des coups. */
function batterieAudible(e: PatternStateV2): DrumRowName[] {
  return DRUMS.filter((l) => !e.rows[l].muted && coups(e, l) > 0);
}

/* Un pas de synthé qui sonne. Même lecture que `synthQuiJoue` (styles.ts) :
 * `null` est une case vide, `-1` un silence explicite — et un pas peut être un
 * nombre (le degré) ou un objet `{ degree, octave }`. Les deux formes vivent
 * dans les données, ne pas en supposer une seule. */
function joue(n: SynthStep): boolean {
  return n !== null && n !== -1;
}

/** Les hauteurs distinctes réellement jouées par une ligne de synthé. */
function degresJoues(e: PatternStateV2, l: SynthRowName): number[] {
  const r = e.synthRows[l];
  const vus = new Set<number>();
  for (const n of r.pattern.slice(0, r.subdivisions)) {
    if (!joue(n)) continue;
    vus.add(typeof n === 'number' ? n : n!.degree + 7 * (n!.octave ?? 0));
  }
  return [...vus];
}

function synthAudible(e: PatternStateV2): SynthRowName[] {
  return SYNTHS.filter((l) => !e.synthRows[l].muted && degresJoues(e, l).length > 0);
}

/** Toutes les lignes qu'on entend, batterie et synthé confondus. */
export function lignesAudibles(e: PatternStateV2): string[] {
  return [...batterieAudible(e), ...synthAudible(e)];
}

/** Les variantes posées (rim shot, charley ouvert) sur les lignes audibles. */
function variantes(e: PatternStateV2): number {
  return batterieAudible(e).reduce(
    (n, l) => n + e.rows[l].pattern.slice(0, e.rows[l].subdiv).filter((v) => v === 2).length,
    0,
  );
}

/** Les rafales posées sur les lignes audibles. */
function rafales(e: PatternStateV2): number {
  return batterieAudible(e).reduce(
    (n, l) => n + e.rows[l].rolls.slice(0, e.rows[l].subdiv).filter((v) => v > 1).length,
    0,
  );
}

/** L'envoi de réverbe le plus fort parmi ce qu'on entend. */
function reverbeMax(e: PatternStateV2): number {
  const drums = batterieAudible(e).map((l) => e.rows[l].reverbSend);
  const synth = synthAudible(e).map((l) => e.synthRows[l].reverbSend);
  return Math.max(0, ...drums, ...synth);
}

/* ---------- Le catalogue ----------
 *
 * Chaque entrée est un jugement musical, pas une mesure : les seuils disent à
 * partir de quand la remarque est JUSTE. Un seuil trop bas fait mentir le jeu
 * (« ta basse fait deux notes » sur une basse qui en fait quatre), et un
 * seuil trop haut le rend muet. Même exigence que les `tolerance` /
 * `ecartMini` de `parametres.ts`.
 */
export const OBSERVATIONS: Observation[] = [
  /* --- Les piques : elles ne se déclenchent que sur ce qui est vraiment maigre --- */
  {
    id: 'une-seule-ligne',
    // La plus spécifique de toutes : il n'y a littéralement qu'une chose à
    // entendre, ce qui rend toute autre remarque hors sujet.
    tient: (e) => lignesAudibles(e).length === 1,
    lignes: [
      '— Une ligne. Une seule. On appelle ça un métronome, pas un morceau.',
      '— Il y a une ligne là-dedans. J’ai vérifié deux fois.',
    ],
    poids: 10,
    ton: 'pique',
  },
  {
    id: 'basse-service-minimum',
    /* ⚠️ UNE seule hauteur, pas deux — et c'est une mesure, pas un avis. Sur
     * les 34 presets, la basse tient sur 1 hauteur dans 3 morceaux, 2 dans 9,
     * 3 dans 10, 4 dans 8, 5 dans 4. À « deux notes ou moins », la pique
     * tombait sur 12 morceaux sur 34 — donc sur du travail honnête, ce qui
     * est exactement le contraire de ce qu'elle doit faire. Une seule note
     * répétée, en revanche, EST le service minimum, et c'est rare. */
    tient: (e) => {
      const d = degresJoues(e, 'bass');
      return !e.synthRows.bass.muted && d.length === 1;
    },
    lignes: [
      '— Ah… service minimum sur la basse.',
      '— Ta basse joue la même note du début à la fin. C’est un choix ?',
    ],
    poids: 9,
    ton: 'pique',
  },
  {
    id: 'reverbe-noyee',
    // `reverbSend` va de 0 à 1, et les 34 presets sont tous à 0 : au-delà de
    // 0,7 c'est forcément un geste du joueur, jamais un héritage.
    tient: (e) => reverbeMax(e) >= 0.7,
    lignes: [
      '— T’as enregistré ça dans une cage d’escalier ?',
      '— Il y a un morceau, quelque part sous la réverbe.',
    ],
    poids: 8,
    ton: 'pique',
  },
  {
    id: 'tout-au-rouge',
    /* ⚠️ Les ÉCHELLES RÉELLES, pas celles du commentaire de `types.ts` :
     * `finalVolume` va de 50 à 150 (c'est un pourcentage, défaut 100) et
     * `globalSaturation` de 0 à 100. Écrite en 0-1, cette observation se
     * déclenchait sur TOUS les états, y compris un Atelier vide — une pique
     * sur un morceau qui n'existe pas. Vérifié dans `serialize.ts` et
     * `engine/graph.ts`, qui divisent l'un et l'autre par 100. */
    tient: (e) => e.globalSaturation >= 80 || e.finalVolume >= 140,
    lignes: [
      '— C’est fort. C’est même trop fort. Ce n’est pas pareil.',
      '— Tu as tout poussé au rouge. Ça ne rend rien plus gros.',
    ],
    poids: 8,
    ton: 'pique',
  },
  {
    id: 'rafales-partout',
    // Six rafales dans une boucle, c'est un bouton qu'on vient de découvrir.
    tient: (e) => rafales(e) >= 6,
    lignes: [
      '— T’as trouvé le bouton rafale. On a entendu. Tout le monde a entendu.',
      '— Six rafales. Une aurait suffi, mais soit.',
    ],
    poids: 7,
    ton: 'pique',
  },
  {
    id: 'tout-sur-les-temps',
    /* ⚠️ Rien ne tombe entre deux temps — c'est le contraire exact de ce que
     * l'acte 1 enseigne (« le kick qui sort du temps »).
     *
     * Cette observation a REMPLACÉ « ton charley ne respire jamais », qui
     * paraissait juste et ne l'était pas : mesuré, 18 presets sur 34 ont un
     * charley sur toutes les cases, et 11 sans la moindre variante. Un
     * charley en doubles-croches est la norme en house, pas une faute — la
     * pique aurait puni du travail correct dans un tiers des cas.
     *
     * Celle-ci se mesure à 1 preset sur 34 (gqom). C'est ce qui la rend
     * juste : ce qu'on remarque doit être rare, sinon ce n'est pas une
     * remarque, c'est un reproche automatique. */
    tient: (e) => {
      const lignes = batterieAudible(e);
      if (lignes.length < 2) return false;
      return lignes.every((l) => {
        const r = e.rows[l];
        const parTemps = r.subdiv / 4;
        if (!Number.isInteger(parTemps)) return false;
        return r.pattern.slice(0, r.subdiv).every((v, i) => !v || i % parTemps === 0);
      });
    },
    lignes: [
      '— Tout tombe pile sur les temps. Rien ne dépasse, rien ne pousse.',
      '— Pas une note entre deux temps. C’est très… ponctuel.',
    ],
    poids: 6,
    ton: 'pique',
  },
  {
    id: 'droit-comme-un-rail',
    // Aucun swing, aucune traîne : la grille est jouée telle quelle.
    tient: (e) => e.swing === 0 && e.drag === 0 && lignesAudibles(e).length >= 2,
    lignes: [
      '— C’est droit. Droit comme un rail de tram.',
      '— Pas un gramme de swing. C’est carré, au sens propre.',
    ],
    poids: 4,
    ton: 'pique',
  },
  {
    id: 'tempo-course',
    // Le plus rapide des 34 presets est à 170 : au-delà de 165 on est au bout
    // de ce que le catalogue considère comme jouable.
    tient: (e) => e.tempo >= 165,
    lignes: ['— On est pressés ? Parce que là, on est pressés.'],
    poids: 3,
    ton: 'pique',
  },
  {
    id: 'tempo-traine',
    // Et le plus lent est à 70, exactement.
    tient: (e) => e.tempo <= 70,
    lignes: ['— C’est lent. J’ai eu le temps de faire un café.'],
    poids: 3,
    ton: 'pique',
  },

  /* --- Les compliments : même exigence, ils doivent être MÉRITÉS --- */
  {
    id: 'basse-qui-bouge',
    /* Quatre hauteurs distinctes ou plus : 12 presets sur 34 y arrivent, donc
     * c'est un bon niveau — mais c'est aussi commun, d'où un poids moyen. Un
     * compliment qui tombe une fois sur trois cesse d'en être un. */
    tient: (e) => !e.synthRows.bass.muted && degresJoues(e, 'bass').length >= 4,
    lignes: [
      '— La basse bouge vraiment. C’est elle qui tient tout, là.',
      '— Ta ligne de basse raconte quelque chose. Garde ça.',
    ],
    poids: 6,
    ton: 'compliment',
  },
  {
    id: 'un-arrangement',
    // Quatre lignes qui sonnent ensemble : ce n'est plus une boucle, c'est un
    // arrangement — et c'est ce que la carrière entière essaie d'enseigner.
    tient: (e) => lignesAudibles(e).length >= 4,
    lignes: [
      '— Quatre lignes qui tiennent ensemble. C’est un arrangement, ça.',
      '— Ça commence à ressembler à un morceau, pas à un exercice.',
    ],
    poids: 5,
    ton: 'compliment',
  },
  {
    id: 'ca-respire',
    // `swing` est un pourcentage de 0 à 75 (serialize.ts) : 12 est le seuil
    // au-delà duquel le décalage s'entend sans qu'on le cherche.
    tient: (e) => e.swing >= 12,
    lignes: [
      '— Ça respire. C’est exactement ce que je te demandais.',
      '— Il y a du swing là-dedans. Ça change tout.',
    ],
    poids: 5,
    ton: 'compliment',
  },
  {
    id: 'variantes-dosees',
    // Une à trois : au-delà ce n'est plus un accent, c'est une décoration.
    tient: (e) => variantes(e) >= 1 && variantes(e) <= 3,
    lignes: [
      '— Les variantes sont bien placées. C’est la bonne dose.',
      '— Le rim shot tombe au bon endroit. C’est pas rien.',
    ],
    poids: 4,
    ton: 'compliment',
  },
];

/* ---------- Le choix ---------- */

export interface Reaction {
  id: string;
  ligne: string;
  ton: TonReaction;
}

/**
 * Ce que le personnage ajoute après avoir accepté — ou `null` s'il n'y a rien
 * de remarquable à dire, ce qui est un résultat légitime (règle 4).
 *
 * ⚠️ Le `rng` est injecté comme partout ailleurs dans le projet, et il ne sert
 * QU'À départager des observations de même poids : le choix lui-même est
 * déterministe. Un tirage sur toute la liste rendrait la réaction indépendante
 * du morceau, c'est-à-dire exactement le défaut qu'on corrige.
 */
export function reactionA(
  e: PatternStateV2,
  rng: () => number = Math.random,
): Reaction | null {
  /* ⚠️ GARDE GLOBALE — rien ne sonne, donc il n'y a rien à commenter.
   *
   * Sans elle, un Atelier vide recevait quand même une réplique (mesuré :
   * `etatVierge()` déclenchait « c'est trop fort »). Une remarque sur un
   * morceau qui n'existe pas est le pire cas du défaut qu'on corrige — c'est
   * la preuve, en une phrase, que le jeu ne regarde pas. */
  if (lignesAudibles(e).length === 0) return null;

  const tenables = OBSERVATIONS.filter((o) => o.tient(e));
  if (tenables.length === 0) return null;
  const max = Math.max(...tenables.map((o) => o.poids));
  const meilleures = tenables.filter((o) => o.poids === max);
  const o = meilleures[Math.min(meilleures.length - 1, Math.floor(rng() * meilleures.length))];
  const ligne = o.lignes[Math.min(o.lignes.length - 1, Math.floor(rng() * o.lignes.length))];
  return { id: o.id, ligne, ton: o.ton };
}
