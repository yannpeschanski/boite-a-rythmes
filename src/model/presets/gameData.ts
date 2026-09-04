// Données du Mode jeu — besace, lots de consolation, roasts. Portées
// VERBATIM depuis l'original (l. 7524–7618) ; les roasts ont été réécrits par
// VERBE le 2026-09-04, voir plus bas.
import type { ExerciseKind } from '../exercises';
import { pick } from './levels';

export interface BagItem { emoji: string; name: string }

export const BAG_ITEMS: BagItem[] = [
  { emoji:'🧦', name:'une chaussette dépareillée' },
  { emoji:'🎩', name:'un chapeau trois tailles trop grand' },
  { emoji:'🪄', name:'une baguette magique en carton' },
  { emoji:'🔮', name:'une boule de cristal fissurée' },
  { emoji:'📻', name:'une radio qui ne capte qu\'une station fantôme' },
  { emoji:'🥁', name:'un tambour un peu bosselé' },
  { emoji:'🎺', name:'une trompette sans embouchure' },
  { emoji:'🪠', name:'une ventouse mystérieusement collante' },
  { emoji:'🧹', name:'un balai qui perd ses poils' },
  { emoji:'🪣', name:'un seau percé' },
  { emoji:'🧽', name:'une éponge déjà toute sèche' },
  { emoji:'🔧', name:'une clé à molette rouillée' },
  { emoji:'🔨', name:'un marteau à tête branlante' },
  { emoji:'🪛', name:'un tournevis qui ne sert à rien' },
  { emoji:'🧲', name:'un aimant qui n\'attire plus grand-chose' },
  { emoji:'🔭', name:'une lunette astronomique en plastique' },
  { emoji:'🧪', name:'une éprouvette d\'origine douteuse' },
  { emoji:'🔑', name:'une clé qui n\'ouvre rien de connu' },
  { emoji:'📦', name:'un carton mystère' },
  { emoji:'✂️', name:'une paire de ciseaux émoussés' },
  { emoji:'🥔', name:'une patate à l\'air suspicieusement intelligente' },
  { emoji:'🐸', name:'un crapaud légèrement électrique' },
  { emoji:'🦴', name:'un os mystère' },
  { emoji:'🧀', name:'un bout de gruyère porte-bonheur' },
  { emoji:'🪀', name:'un yoyo qui ne remonte plus' },
  { emoji:'🐙', name:'une pieuvre en plastique gluant' },
  { emoji:'🧃', name:'une brique de jus limite périmée' },
  { emoji:'🪶', name:'une plume de pigeon des villes' },
  { emoji:'🍌', name:'une banane légèrement inquiétante' },
  { emoji:'🧊', name:'un glaçon qui refuse de fondre' },
  { emoji:'🪅', name:'une piñata déjà vide' },
];

// Lots de consolation : quand on abandonne un rythme (ex. "Nouveau rythme" sans
// avoir trouvé), on récolte quand même quelque chose — mais un objet franchement nul.
export const CONSOLATION_ITEM: BagItem = { emoji:'🧾', name:'un ticket de caisse illisible pour un article inconnu' };
export const ABANDON_LINES: string[] = [
  "Abandon en rase campagne. Le rythme te regarde partir sans un mot.",
  "T'as jeté l'éponge — enfin, façon de parler, y'avait pas d'éponge.",
  "Nouveau rythme demandé sans finir le précédent. Fuite stratégique ou pure lâcheté ? Va savoir.",
  "Capitulation en direct. Le tempo continue sans toi, imperturbable.",
  "T'as tourné les talons avant la fin. Ça arrive aux meilleurs, paraît-il — mais surtout à toi, là.",
  "Retraite anticipée. Le hi-hat n'en revient toujours pas.",
];

/* LES ROASTS — ce qu'on dit au joueur après une victoire.
 *
 * ⚠️ RÉÉCRITS PAR VERBE le 2026-09-04. Retour de Yann : *« il faut revoir les
 * roasts pour que ça corresponde à l'exercice réalisé. Le système avait été
 * défini sur un de reproduction de rythme uniquement. »*
 *
 * Le système d'origine combinait trois axes, et deux mentaient sur la moitié
 * du jeu :
 *
 *   - la DIFFICULTÉ, lue sur `voiceTier`. Mesuré : `hard` couvre 51 niveaux de
 *     DOUZE verbes différents, et sa réplique annonce « DIFFICILE, avec de la
 *     polyrythmie… le hat comptait en 3 pendant que tout le reste comptait en
 *     4 » — sur un exercice de vocabulaire, de style ou de laverie où il n'y a
 *     aucune polyrythmie. L'axe est retiré : ses trois répliques n'étaient
 *     vraies que sur une poignée de niveaux ;
 *   - les ÉCOUTES (`loopPlays`, `guessPlays`), comptées par `play('target')` et
 *     `play('guess')`. Les verbes de paramètre écoutent par `ecouterVersion`,
 *     qui ne comptait rien : le roast affirmait « une seule écoute de la
 *     boucle » et « sans même réécouter ta propre version » à quelqu'un qui
 *     venait de comparer deux versions dix fois, et qui n'a pas de « version ».
 *
 * La règle qui remplace : **un roast ne commente que ce qui a été mesuré.**
 * Deux axes toujours vrais — le VERBE (le geste qu'on vient de faire) et les
 * ESSAIS (comptés dans `verify()`, donc pour tous les verbes) — plus un
 * troisième tiré de ce que l'écran a réellement compté, et rien si personne
 * n'a rien compté.
 */

/** Ce que le tour a compté. Un champ à zéro veut dire « pas mesuré ». */
export interface MesuresDuTour {
  /** Tentatives de vérification — comptées dans `verify()`, tous verbes. */
  attempts: number;
  /** Écoutes de la CIBLE (verbes de grille). */
  loopPlays: number;
  /** Réécoutes de SA version (verbes de grille). */
  guessPlays: number;
  /** Écoutes des VERSIONS (verbes de paramètre et laverie). */
  paramEcoutes: number;
}

/* Le geste qu'on vient de faire, une pique par verbe. C'est l'axe qui remplace
 * la « difficulté » : il est vrai par construction, puisqu'il décrit ce que
 * l'exercice demandait. */
export const ROAST_VERBE: Record<ExerciseKind, string[]> = {
  reproduire: [
    "Grille reposée à l'oreille, case par case. Du travail de copiste, mais bien fait.",
    "Tu as remis chaque coup à sa place. Le rythme n'a rien vu venir.",
    "Reproduite. Ni plus ni moins que ce qu'on demandait — ne fais pas le fier.",
  ],
  completer: [
    "Un trou dans la grille, et tu l'as bouché. Le reste était donné, cela dit.",
    "Tu as complété ce qui manquait. Le contexte faisait la moitié du boulot.",
    "Trou comblé. L'oreille travaille mieux quand on lui laisse des repères, hein ?",
  ],
  intrus: [
    "Tu as repéré celle qui clochait. Quatre mesures, une menteuse, et toi.",
    "L'intrus démasqué. Aucune grille à toucher : juste des oreilles, pour une fois.",
    "Trouvé. Il ne restait qu'à écouter — la partie difficile, curieusement.",
  ],
  jouer: [
    "Tu as tapé en rythme au lieu d'analyser. Le corps sait des choses que la tête ignore.",
    "Frappé dans le tempo. La boucle ne t'a pas attendu, et tu as suivi quand même.",
    "Joué à la main. C'est le seul exercice où réfléchir te ralentit.",
  ],
  lequel: [
    "Tu as entendu lequel en avait le plus. Une oreille qui compare est déjà une oreille.",
    "Désigné du doigt, sans savoir le nommer. On commence tous par là.",
    "La bonne version repérée. Reste à savoir POURQUOI, mais chaque chose en son temps.",
  ],
  nommer: [
    "Tu as mis le mot sur le son. C'est ce qui permet d'y penser, après.",
    "Nommé. Un paramètre qu'on sait nommer est un paramètre qu'on sait aller chercher.",
    "Le bon nom. Du premier ou du dixième coup, il est posé — c'est l'essentiel.",
  ],
  regler: [
    "Curseur posé à l'oreille et pas au chiffre. C'est toute la différence.",
    "Tu as visé un SON et tu es tombé dessus. Le nombre affiché ne t'a rien appris.",
    "Réglé. À quelques poussières près, mais l'oreille s'en moque — et c'est elle le juge.",
  ],
  melodie: [
    "Ligne reposée note à note. Tu entends des hauteurs, maintenant, plus seulement des coups.",
    "La mélodie retrouvée. Ce n'est plus de la batterie, et ça s'entend.",
    "Degrés replacés. La tonique t'attendait au bout, comme toujours.",
  ],
  arrangement: [
    "Plusieurs lignes d'un coup. Tu ne recopies plus un rythme, tu recopies un morceau.",
    "Batterie ET synthé dans la même colonne. C'est là que commence l'arrangement.",
    "Toutes les voix remises en place. Ça fait beaucoup de cases pour un seul cerveau.",
  ],
  silence: [
    "Tu as entendu ce qui n'était PAS là. Plus dur que d'entendre ce qui y est.",
    "Le trou repéré. Le silence fait partie du rythme, tu viens de le prouver.",
    "Trouvé, et sans rien voir : il n'y avait rien à voir.",
  ],
  laverie: [
    "Tu as choisi celui qui survit au petit haut-parleur. Ton ordinateur n'est pas le monde.",
    "Le kick qui tient encore ailleurs que chez toi. C'est ça, produire.",
    "Bien vu : sur le moniteur ils se valaient, dans la laverie non.",
  ],
  style: [
    "Genre reconnu. Ce n'est pas l'oreille qui travaille ici, c'est la culture.",
    "Tu as mis un nom sur un truc que tout le monde reconnaît sans savoir le dire.",
    "Le bon genre. Le commercial de Zik'Mobile, lui, aurait fredonné.",
  ],
};

/* Les ESSAIS — comptés dans `verify()`, donc vrais quel que soit le verbe.
 * C'est le seul axe que l'ancien système n'avait pas, alors que c'est le seul
 * dont la mesure existait partout. */
export const ROAST_ESSAIS: Record<string, string[]> = {
  1: [
    "Et du premier coup. Soit tu as compris, soit tu as eu de la chance — on ne saura jamais.",
    "Premier essai, première réponse. On n'a même pas eu le temps de se moquer.",
    "Trouvé d'emblée. Suspect, mais on valide.",
  ],
  2: [
    "En deux ou trois essais : la moyenne des gens honnêtes.",
    "Quelques tentatives, rien de honteux. C'est comme ça que ça rentre.",
    "Deuxième ou troisième coup — le rythme de croisière du perfectionniste raisonnable.",
  ],
  3: [
    "Après un nombre d'essais qu'on préfère ne pas afficher.",
    "Il aura fallu insister. L'obstination compte aussi, paraît-il.",
    "Beaucoup d'essais. Beaucoup. Mais tu es là, et c'est ce qui reste.",
  ],
};

/* Les COMPARAISONS entre versions — l'axe des verbes de PARAMÈTRE, qui n'ont
 * pas de « boucle cible » ni de « version à soi ». Compté par `ecouterVersion`
 * depuis le 2026-09-04 : avant, il ne l'était nulle part, et le roast parlait
 * quand même. */
export const ROAST_COMPARAISONS: Record<string, string[]> = {
  1: [
    "Une seule écoute des versions, et tu as tranché. Confiance ou inconscience.",
    "Tu as comparé une fois. Une. On admire ou on s'inquiète.",
    "Écouté une version, et hop. L'instinct pur.",
  ],
  2: [
    "Deux passages sur les versions : le minimum syndical du sérieux.",
    "Comparées deux fois — la rigueur normale de ceux qui doutent un peu.",
    "Deux écoutes et la décision est tombée. Propre.",
  ],
  3: [
    "Tu as fait l'aller-retour entre les versions un paquet de fois. Elles ont fini par avouer.",
    "Comparées, recomparées, re-recomparées. À force, la différence saute.",
    "Beaucoup d'allers-retours. C'est exactement comme ça qu'on se forme l'oreille, cela dit.",
  ],
};

export const ROAST_GUESS: Record<string, string[]> = {
  yes: [
    "Et en plus t'as réécouté ta propre version avant de valider, comme un pro un peu parano.",
    "Auto-contrôle qualité activé : t'as réécouté ta version comme un ingé son sous stress.",
    "Tu as même vérifié ta propre version. La confiance, ça se mérite, apparemment pas tout de suite.",
  ],
  no: [
    "Et tout ça sans même réécouter ta propre version. Soit t'es un génie, soit un inconscient.",
    "Zéro coup d'œil sur ta propre version avant de valider. L'instinct pur, ou l'inconscience pure.",
    "T'as foncé sans réécouter ta version. Le courage ou l'inconscience, difficile à trancher.",
  ],
};
export const ROAST_LOOP: Record<string, string[]> = {
  1: [
    "Une seule écoute de la boucle. Une oreille bionique, ou beaucoup de chance.",
    "Écouté une fois, une seule fois. Soit t'es un métronome humain, soit t'as deviné.",
    "Une écoute et basta. Le rythme n'a rien vu venir.",
  ],
  2: [
    "Deux écoutes de la boucle, le minimum syndical du perfectionniste raisonnable.",
    "Deux passages en boucle, la rigueur normale des gens qui doutent un minimum.",
    "Deux écoutes. On respecte la méthode.",
  ],
  3: [
    "La boucle a tourné un paquet de fois avant que ça rentre. Le rythme a fini par abandonner et se laisser deviner.",
    "Boucle écoutée en boucle en boucle... la patience a fini par payer, à défaut de l'oreille.",
    "Tellement d'écoutes que le hi-hat a demandé une pause.",
  ],
};

/* COMPOSER LE ROAST — pur, donc testable sans navigateur ni Web Audio.
 *
 * ⚠️ La règle tient en une ligne : **on ne commente que ce qui a été mesuré.**
 * Le troisième bout n'existe que si un compteur l'a vu passer, et il est choisi
 * dans l'observation la plus SPÉCIFIQUE de celles qui sont vraies — comparer
 * des versions en dit plus que « la boucle a tourné », et réécouter sa propre
 * version en dit plus que l'avoir écoutée.
 *
 * Deux bouts suffisent quand le joueur n'a rien écouté : un roast court vaut
 * mieux qu'un roast qui invente.
 */
export function composerRoast(
  verbe: ExerciseKind,
  m: MesuresDuTour,
  choisir: <T>(a: T[]) => T = (a) => pick(a),
): string {
  const palier = (n: number) => (n <= 1 ? '1' : n <= 2 ? '2' : '3');
  const bouts = [
    choisir(ROAST_VERBE[verbe] ?? ROAST_VERBE.reproduire),
    choisir(ROAST_ESSAIS[m.attempts <= 1 ? '1' : m.attempts <= 3 ? '2' : '3']),
  ];
  if (m.paramEcoutes > 0) {
    bouts.push(choisir(ROAST_COMPARAISONS[palier(m.paramEcoutes)]));
  } else if (m.guessPlays > 0) {
    bouts.push(choisir(ROAST_GUESS.yes));
  } else if (m.loopPlays > 0) {
    /* Les deux sont vraies : la boucle a tourné N fois, et sa version n'a
     * jamais été réécoutée. On tire dans les deux plutôt que d'en sacrifier
     * une — c'est aussi ce qui garde vivantes les répliques de `ROAST_GUESS.no`. */
    bouts.push(choisir([...ROAST_LOOP[palier(m.loopPlays)], ...ROAST_GUESS.no]));
  }
  return bouts.join(' ');
}

/* ---------------------------------------------------------------------------
 * LE ROAST D'UNE LIVRAISON — le pendant de celui des exercices.
 *
 * ⚠️ Demande de Yann (2026-09-04), dans la foulée des étoiles : *« du coup, tu
 * peux aussi adapter les roasts en fonction »*. Les étoiles d'un cahier se
 * gagnent sur deux gestes — avoir cherché des réglages que personne ne
 * demandait, et avoir écouté son morceau tourner. L'écran affichait ces étoiles
 * avec une phrase d'aide écrite d'avance, la même pour tout le monde : elle
 * disait quoi faire, jamais ce qu'on venait de faire.
 *
 * Même règle que pour les exercices, et pour la même raison : **on ne commente
 * que ce qui a été mesuré**. Les deux axes sont ici les deux moitiés de la
 * note, donc la remarque explique l'étoile qui manque sans jamais avoir à la
 * nommer — et elle salue quand il n'en manque aucune.
 *
 * ⚠️ Ça ne double PAS `model/reactions.ts` : celui-là commente le MORCEAU (un
 * fait de l'état livré), celui-ci commente la FAÇON DE TRAVAILLER. C'est la
 * même frontière que pour les exercices, et elle tient tant qu'on ne mélange
 * pas les deux sources.
 * ------------------------------------------------------------------------- */

/** Les réglages cherchés en plus du cahier : aucun, un ou deux, trois et plus. */
export const ROAST_LIVRAISON_REGLAGES: Record<string, string[]> = {
  0: [
    "Tu as coché le cahier et tu es parti. Pas un bouton de plus : le client ne verra pas la différence, toi si.",
    "Zéro réglage cherché. Le morceau fait ce qu'on demande et rien d'autre — c'est une livraison, pas une production.",
    "Rien touché au-delà de la commande. On appelle ça le minimum, et le pire c'est que ça marche.",
  ],
  1: [
    "Un ou deux réglages cherchés au passage. C'est un début de goût.",
    "Tu as touché à deux choses que personne ne demandait. Continue : c'est là que ça devient un son.",
    "Quelques boutons poussés en plus du cahier. Le morceau commence à être le tien.",
  ],
  2: [
    "Tu as cherché des réglages que personne ne t'a demandés. C'est exactement ça, produire.",
    "Trois boutons au moins, pour ton seul plaisir. Sol ne dira rien, mais elle a entendu.",
    "Le cahier était le minimum et tu l'as compris. Le reste, c'est toi.",
  ],
};

/** L'écoute, en cycles du motif : jamais, une fois, plusieurs. */
export const ROAST_LIVRAISON_ECOUTE: Record<string, string[]> = {
  0: [
    "Et tu ne l'as pas écouté tourner une seule fois avant d'envoyer.",
    "Livré sans écouter. Le client, lui, va l'écouter.",
    "Pas un tour de boucle avant de cliquer. Courageux.",
  ],
  1: [
    "Tu l'as écouté tourner une fois avant d'envoyer. Ça compte.",
    "Un tour de boucle, et c'est parti.",
    "Écouté une fois — la moitié du métier tient là-dedans.",
  ],
  2: [
    "Et tu l'as laissé tourner : c'est là qu'on entend ce qu'on n'avait pas voulu voir.",
    "Plusieurs tours de boucle avant d'envoyer. Tu as fini par l'entendre pour de vrai.",
    "Tu l'as écouté tourner, et retourner. C'est comme ça qu'on trouve ce qui cloche.",
  ],
};

/* La remarque affichée sous les étoiles d'une livraison. PURE, comme celle des
 * exercices : la vue ne fait que l'afficher. */
export function composerRoastLivraison(
  reglagesEnPlus: number,
  cycles: number,
  choisir: <T>(a: T[]) => T = (a) => pick(a),
): string {
  const palier = (n: number) => (n <= 0 ? '0' : n <= 2 ? '1' : '2');
  return [
    choisir(ROAST_LIVRAISON_REGLAGES[palier(reglagesEnPlus)]),
    choisir(ROAST_LIVRAISON_ECOUTE[cycles <= 0 ? '0' : cycles <= 1 ? '1' : '2']),
  ].join(' ');
}
