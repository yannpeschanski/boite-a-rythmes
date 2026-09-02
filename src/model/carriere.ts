/* Le Mode carrière — la charpente en huit actes du récit de `HISTOIRE.md`.
 *
 * Pourquoi ce fichier existe
 * --------------------------
 * `PlayerProgress.level` était UN SEUL entier qui portait trois choses sans
 * rapport : ce que le joueur sait, ce qui lui est ouvert, et pourquoi il
 * continue (docs/plan/03-journal-migration.md, « Architecture du Mode jeu »). Tant qu'il n'y avait qu'un
 * verbe et une ligne droite, ça tenait ; avec sept verbes, ça ne tient plus.
 *
 * L'arbitrage de Yann (2026-08-23, « on part sur le scénario ») sépare l'entier
 * en DEUX axes qui ne se mélangent plus :
 *
 *   - le RÉCIT — où on en est dans l'histoire. C'est ce fichier, et c'est lui
 *     qui ouvre les modules : « ton morceau a besoin d'une basse, voilà le
 *     Synthé » est un moment de récit, « le niveau 13 ouvre le Synthé » est un
 *     nombre à justifier.
 *   - le RÉSERVOIR — les 41 niveaux et leurs étoiles, qui restent exactement ce
 *     qu'ils sont : la salle de répétition. Rien ne se jette, rien ne se
 *     renumérote.
 *
 * Un acte ne fabrique donc AUCUN exercice : il en cite. Une étape d'exercice
 * n'est qu'un `niveau` du réservoir, ce qui rend le contenu bon marché à écrire
 * et garantit qu'un niveau joué dans la carrière est exactement le même niveau
 * qu'en répétition — pas une variante qui dériverait de son original.
 *
 * Module PUR : ni rune, ni DOM, ni audio. Le store n'en garde que le curseur.
 */
import type { LockedModule } from './unlocks';
import { LEVELS } from './presets/levels';
import {
  type Contrainte,
  lignesPresentes,
  auMoinsUneRafale,
  swingAuMoins,
  ligneSynthPresente,
  pasLeMotifDeDepart,
  dansLeStyleFiche,
  pasUnPresetCharge,
  kickQuiPorte,
  avoirEnleve,
  deLEspaceSansSoupe,
  kickQuiSortDuTemps,
  dePlacePourLaVoix,
  auMoinsUneVariante,
  filtreQuiCoupe,
  delayEngage,
  reverbDosee,
  contrasteDeVolume,
  chaqueLigneRetouchee,
  uneLigneQuiGlisse,
  deLAlea,
  unePhrase,
  seReposeSurLaTonique,
  poseLePremierTemps,
  basseQuiTient,
  nappeQuiRespire,
  voixChoisie,
  duGlide,
} from './commande';
import { ficheStyle } from './styles';
import { etatVierge, etatDepuisGrille } from './defaults';

/* Le point de départ d'une commande, figé une fois : toutes s'en servent pour
 * refuser une livraison qu'on n'a pas touchée (voir `pasLeMotifDeDepart`).
 *
 * ⚠️ C'est `etatVierge()` et non `defaultState()` depuis le 2026-08-27 :
 * ouvrir une commande vide désormais l'Atelier, donc c'est à la table rase
 * qu'il faut comparer. Laissé sur `defaultState()`, le motif d'accueil et la
 * table rase différaient — et la case « il faut y avoir touché » se cochait
 * toute seule à l'ouverture, exactement le défaut que Yann a signalé. */
const DEPART = etatVierge();
const AVOIR_PRODUIT = pasLeMotifDeDepart(DEPART);

/* Le point de départ de la commande de Kelvin — le rythme du niveau 17, celui
 * que le joueur vient de reproduire. Une commande qui TRANSFORME compare à son
 * propre départ, pas à la table rase : sinon « il faut y avoir touché » serait
 * coché dès l'ouverture, puisque l'Atelier n'est justement pas vide. */
const NIVEAU_KELVIN = LEVELS.find((l) => l.id === 63)!;
const DEPART_KELVIN = etatDepuisGrille(NIVEAU_KELVIN.grille!, NIVEAU_KELVIN.tempoOptions[0]);

/* La fiche du genre commandé par Zik'Mobile. Chargée une fois : elle sert à la
 * fois de brief affiché et de juge (voir `model/styles.ts`). */
const FICHE_DANCEHALL = ficheStyle('dancehall')!;
const FICHE_TECHNO = ficheStyle('techno')!;
/* Les trois genres que l'acte 5 fait PRODUIRE, un par catégorie du fax de
 * Zik'Mobile — hip-hop authentique, club énergie, ambiance latino. Le
 * quatrième (urbain festif) est le dancehall, qui clôt l'acte depuis toujours. */
const FICHE_DILLA = ficheStyle('dilla')!;
const FICHE_GARAGE = ficheStyle('garage')!;
const FICHE_DEMBOW = ficheStyle('dembow')!;

/* Les deux temps de la commande du Tunnel, tels que Yann les a décrits :
 * « il faut d'abord remplir le séquenceur avec un morceau techno, puis ensuite
 * régler les paramètres pour avoir un meilleur son ». */
const LE_MORCEAU = '1 · LE MORCEAU';
const LE_MIXAGE = '2 · LE MIXAGE — pour que ça tienne à la laverie';

/* Les couches du jingle de Rachid, une par envoi — « mélodie, basse, nappe,
 * additionnées, plus les textures » (Yann). Le titre de section dit CE QU'ON
 * AJOUTE : un cahier à plat ne dirait pas que c'est un empilement. */
/* Les quatre sections du cahier de FB-015 — une par acte traversé. C'est le
 * seul cahier du jeu qui soit une RÉCAPITULATION : ses titres nomment ce qu'on
 * a appris, pas ce qu'un client exige. */
const FB_RYTHME = '1 · LE RYTHME — ce que tu sais faire depuis l’acte 1';
const FB_GROOVE = '2 · LE GROOVE — pour que ça ne fasse pas réveil';
const FB_COUCHES = '3 · LES COUCHES — la mélodie, la basse, la nappe';
const FB_PRODUCTION = '4 · LA PRODUCTION — pour que ça tienne ailleurs qu’ici';

const LA_PHRASE = 'LA PHRASE — ce qu’il a entendu dans l’escalier';
const LA_BASSE = 'LA BASSE — ce qu’il y a dessous';
const LA_NAPPE = '1 · LA NAPPE — ce qu’il y a derrière';
const LES_TEXTURES = '2 · LES TEXTURES — une note n’est pas un son';

function dansLaSection<T extends { section?: string }>(section: string, lignes: T[]): T[] {
  return lignes.map((l) => ({ ...l, section }));
}

export type ActeId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/* Les huit compétences du récit — une par acte, `HISTOIRE.md` § « Ce que le
 * récit ouvre, acte par acte ». Elles ne sont pas (encore) mesurées : ce sont
 * les titres que l'acte décerne, affichés tels quels comme dans le texte
 * (`COMPÉTENCE : ÉCOUTE`). */
export type CompetenceId =
  | 'ecoute'
  | 'rythme'
  | 'groove'
  | 'melodie'
  | 'production'
  | 'styles'
  | 'creation'
  | 'scene';

/* Une étape de récit : quelques lignes courtes, à afficher telles quelles.
 *
 * ⚠️ `source` n'est pas décoratif — c'est la règle d'affichage de
 * `HISTOIRE.md` : « on montre les appareils, pas le décor ». Le joueur ne voit
 * jamais un visage ni une pièce, il voit le panneau de commande de ce qu'il
 * utilise. D'où un répondeur pour les briefs, un afficheur LCD pour les mots de
 * Sol, un fax pour les commandes. Corollaire et budget : si ça ne tient pas sur
 * un afficheur, ce n'est pas dans le jeu — d'où des lignes courtes, une idée
 * par ligne, et jamais de description. */
export type SourceRecit = 'repondeur' | 'lcd' | 'fax' | 'cassette';

export interface EtapeRecit {
  kind: 'recit';
  source: SourceRecit;
  /** L'en-tête de l'appareil : « MESSAGE 1 », « BRIEF », « SOL »… */
  entete: string;
  lignes: string[];
}

export interface EtapeExercice {
  kind: 'exercice';
  /** `GameLevel.id` du réservoir. Jamais une copie du niveau : une citation. */
  niveau: number;
  /** Ce que la commande demande, en une ligne. Remplace le préambule du niveau
   *  quand on le joue depuis la carrière : c'est le brief du client, pas la
   *  fiche pédagogique. Facultatif — sans lui, le préambule du niveau sert. */
  commande?: string;
}

/* La LIVRAISON — on repart avec l'objet, pas avec un score.
 *
 * Idée de Yann : « sortir une vraie sonnerie de téléphone avec […] ce qui peut
 * être drôle, c'est de l'exporter et de proposer d'en faire la sonnerie de son
 * téléphone/réveil matin. »
 *
 * Elle tombe à la fin de l'acte 1, et ce n'est pas un hasard : c'est l'acte qui
 * OUVRE l'Atelier. Le déverrouillage cesse d'être une annonce — on y entre avec
 * le rythme qu'on vient de faire, et on en sort avec un fichier. L'export MP3
 * existe depuis toujours, il ne manquait que le moment. */
export interface EtapeLivraison {
  kind: 'livraison';
  entete: string;
  /* Le titre sous lequel la DISCOGRAPHIE range ce qu'on emporte — voir
   * `model/discographie.ts`. La livraison de l'acte 1 est un cadeau et non une
   * épreuve, mais c'est quand même une production : le récit dit « elle est à
   * toi », il faut donc pouvoir la ressortir. */
  titre: string;
  /** Pour qui — ici, le label lui-même. */
  client: string;
  lignes: string[];
  /** Le libellé du bouton qui emmène dans l'Atelier. */
  bouton: string;
}

/* La COMMANDE — l'étape où on ne retrouve rien, où on FAIT.
 *
 * Idée de Yann : *« à la fin de chaque acte où il est question d'une production
 * à livrer, on pourrait devoir produire quelque chose dans l'Atelier et le
 * présenter au Mode carrière pour qu'il valide l'acte »*.
 *
 * Les onze verbes du jeu demandent tous de RETROUVER quelque chose. Le récit,
 * lui, ne parle que de livrer : des sonneries, un jingle, un morceau pour Le
 * Tunnel, un pack de quinze styles. La commande est le seul moment où
 * l'Atelier cesse d'être une récompense pour devenir l'outil de travail.
 *
 * ⚠️ Le transport de l'état ne passe PAS par un fichier. L'Atelier et la
 * carrière sont la même application et le même store : un aller-retour par
 * export/import n'existerait que parce qu'on n'a pas câblé les deux, et il
 * coûterait cher là où le jeu se joue (390 px, un sélecteur de fichiers).
 *
 * Ce qui est vérifié vit dans `model/commande.ts` — et c'est là qu'est le vrai
 * travail, pas ici. */
export interface EtapeCommande {
  kind: 'commande';
  entete: string;
  lignes: string[];
  /** Le libellé du bouton qui emmène à l'Atelier. */
  bouton: string;
  /* ⚠️ Les modules dont le CAHIER a besoin, ouverts le temps de la commande.
   *
   * Sans ça, l'acte 3 était un cul-de-sac : sa commande exige une basse, or
   * `moduleUnlocked` n'ouvre le Synthé qu'une fois l'acte 3 FRANCHI
   * (`acte > 3`). La commande demandait donc quelque chose que le joueur ne
   * pouvait pas faire, et la carrière s'arrêtait là — trouvé par Yann en
   * jouant, pas par un test.
   *
   * C'est la même idée que `sharedPattern` pour l'Atelier : une intention
   * explicite ouvre ce qu'il faut pour l'honorer, et rien de plus. Le module
   * se referme quand la commande est livrée — c'est l'acte qui l'ouvre pour de
   * bon, juste après. */
  modulesRequis?: LockedModule[];
  /** Ce que Sol vérifie en recevant. Beaucoup de morceaux le satisfont : une
   *  commande n'a pas UNE réponse, elle a des exigences. */
  cahier: Contrainte[];
  /* La DESCRIPTION du genre demandé, quand il y en a un — reprise telle quelle
   * de la fiche de style, jamais réécrite ici. Une commande de style sans
   * description exigerait du joueur qu'il connaisse déjà le genre, ce qui
   * n'est pas ce qu'on lui enseigne (retour de Yann : « il faut avoir une
   * description du style éventuellement »). */
  chapeau?: string[];
  /* ⚠️ D'où part l'Atelier — l'`id` d'un niveau à GRILLE ÉCRITE.
   *
   * Sans ce champ, une commande part d'une table rase (`etatVierge()`). Avec
   * lui, elle part du rythme que le joueur vient de reproduire, et le travail
   * demandé devient une TRANSFORMATION : « on n'apprend pas les paramètres de
   * manière abstraite, on les utilise parce qu'on en a besoin pour fabriquer
   * quelque chose » (Yann).
   *
   * ⚠️ Deux conditions, non négociables — voir `etatDepuisGrille` :
   *   - le niveau cité doit avoir une grille ÉCRITE, jamais générée, sinon le
   *     point de départ serait tiré au sort et le travail demandé avec lui ;
   *   - le cahier doit exiger ce que ce rythme n'a PAS. Un cahier satisfait
   *     par son propre point de départ est du théâtre, et c'est exactement le
   *     défaut que `etatVierge()` avait corrigé.
   * `tests/transformer.test.ts` tient les deux. */
  partirDu?: number;
  /* ⚠️ Partir de la PRODUCTION déjà livrée dans cet acte, au lieu d'un niveau.
   *
   * Retour de Yann (2026-09-01) sur l'acte 4 : *« les livraisons intermédiaires
   * doivent être remplacées par les nouvelles jusqu'à la fin de l'acte »*. Un
   * acte de production n'est pas une suite d'exercices sur un morceau neuf à
   * chaque fois : c'est UN morceau qu'un client renvoie, et qu'on reprend.
   *
   * `partirDu` ne pouvait pas le faire — il cite un niveau à grille écrite,
   * donc un point de départ figé dans les données. Ici le départ est ce que le
   * JOUEUR a livré à l'étape précédente, relu dans la discographie
   * (`productionDeLActe`). S'il n'y a rien encore — acte rejoué depuis une
   * sauvegarde ancienne, discographie vidée — on retombe sur la table rase
   * plutôt que de bloquer la carrière. */
  partirDeLaLivraison?: boolean;
  /** Ce que Sol dit quand elle accepte. */
  accepte: string;
  /** Le titre sous lequel la discographie range le morceau livré. */
  titre: string;
  /* ⚠️ Ce que cette livraison REMPLACE dans son acte (voir `discographie.ts`).
   *
   * Absente, la commande occupe la série par défaut de l'acte : c'est ce qu'il
   * faut pour un acte qui ne livre qu'un morceau, et pour une CHAÎNE d'envois,
   * dont les trois versions sont le même morceau et doivent se remplacer.
   * Renseignée, elle ouvre une série à part — l'acte 5 livre quatre GENRES
   * différents, et sur une clé d'acte le joueur en produisait quatre pour n'en
   * retrouver qu'un. */
  serie?: string;
  /** Qui l'a reçu — c'est ce qui fait d'une liste une discographie. */
  client: string;
}

export type Etape = EtapeRecit | EtapeExercice | EtapeLivraison | EtapeCommande;

export interface Acte {
  id: ActeId;
  /** Le titre du récit, en capitales comme dans `HISTOIRE.md`. */
  titre: string;
  /** Le repère temporel de l'acte (« Cinq mois avant »). */
  quand: string;
  /** Jours avant le 14 juin, pour le compte à rebours affiché en permanence. */
  jours: number;
  competence: CompetenceId;
  /** Le titre décerné, tel qu'il s'écrit à la fin de l'acte. */
  competenceLabel: string;
  /** Le module que l'acte ouvre — `null` pour les actes 0, 2, 5 et 6, qui ne
   *  paient aucune dette mécanique et sont donc bon marché à écrire. */
  module: LockedModule | null;
  /** Une ligne pour la liste des actes. */
  resume: string;
  etapes: Etape[];
}

/* Le compte à rebours, acte par acte.
 *
 * Les repères du texte (« Cinq mois avant », « Six semaines avant »…) convertis
 * en jours avant le 14 juin, sur une année ordinaire. ⚠️ Aucune ANNÉE ne
 * s'affiche jamais (`HISTOIRE.md`) : on affiche des jours et une date sans
 * millésime, ce qui date l'histoire à deux ans près — ce qui suffit.
 */
const JOURS: Record<ActeId, number> = { 0: 151, 1: 120, 2: 92, 3: 61, 4: 42, 5: 28, 6: 14, 7: 0 };

/* ⚠️ L'ANNÉE — 2005, et ce n'est pas un détail de décor.
 *
 * Retour de Yann : *« dans l'histoire, il faut mettre des dates. Dire que
 * c'est en 2004, 2005 ou 2006 »*. 2005 parce que c'est la seule des trois où
 * le postulat tient : les sonneries mono et polyphoniques sont encore un vrai
 * marché — un petit label peut en vivre, ce qui est exactement ce que Face B
 * fait — le fax, la cassette et le répondeur sont des outils et pas des
 * accessoires nostalgiques, et MSN est le chemin normal vers un commercial.
 * En 2006 le marché des sonneries s'effondre et le récit n'a plus de sol.
 *
 * ⚠️ Une seule date est écrite : le concert. Tout le reste s'en DÉDUIT, via
 * `JOURS`. Deux sources de vérité pour un calendrier finiraient par ne plus
 * être d'accord — et la coïncidence qui suit se perdrait au premier
 * ajustement : les quatre premiers actes tombent exactement le 14 de leur
 * mois (151, 120, 92 et 61 jours avant le 14 juin), et les trois derniers à
 * six, quatre et deux semaines. Le calendrier du récit était déjà écrit dans
 * `JOURS`, il n'était simplement pas affiché. */
export const ANNEE = 2005;
const CONCERT = Date.UTC(ANNEE, 5, 14); // 14 juin 2005

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/** La date réelle d'un acte, déduite de son compte à rebours. */
export function dateDeLActe(id: ActeId): string {
  const d = new Date(CONCERT - JOURS[id] * 86400000);
  return `${d.getUTCDate()} ${MOIS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/* Le PROLOGUE — les quatre écrans qui manquaient, et dont l'absence rendait
 * tout le reste illisible.
 *
 * ⚠️ Retour de Yann sur la première version : *« 1ère impression : on comprend
 * rien »*. La cause n'était ni l'interface ni les exercices : le jeu s'ouvrait
 * sur « Le sous-traitant qui fabrique les sonneries arrête », c'est-à-dire sur
 * la première PÉRIPÉTIE d'une histoire dont la mise en place n'avait jamais été
 * montrée. Or elle est écrite — `HISTOIRE.md` lui consacre cent quarante lignes
 * avant l'acte 0 : le label, ce qui le fait vivre, qui tu es, et le 14 juin.
 * Rien de tout ça n'était dans le jeu.
 *
 * La leçon, à ne pas repayer : quand un récit est écrit dans un document et
 * cité par le code, **ce qui n'a pas été porté n'existe pas**. Le lecteur du
 * document comprend ; le joueur, non — et c'est lui qui juge.
 *
 * Ces quatre écrans vivent dans les étapes de l'acte 0 plutôt que dans une
 * structure à part : le curseur, la persistance et la relecture marchent alors
 * sans un seul cas particulier. `LONGUEUR_PROLOGUE` sert seulement à la vue, à
 * qui il permet de tenir le carnet et le compte à rebours hors de l'écran tant
 * qu'ils ne veulent encore rien dire.
 */
/* Le PROLOGUE — la mise en place, et sa LONGUEUR est un réglage à part entière.
 *
 * ⚠️ Deux retours de Yann l'ont façonné, dans cet ordre :
 *
 * 1. *« 1ère impression : on comprend rien »* — le jeu s'ouvrait sur la
 *    première péripétie sans avoir jamais montré la mise en place, pourtant
 *    écrite sur cent quarante lignes dans `HISTOIRE.md`. Ce qui n'a pas été
 *    porté n'existe pas : celui qui a lu le document comprend l'écran, le
 *    joueur juge sur ce qui s'affiche.
 * 2. *« ça fait en effet beaucoup de texte avant le 1er jeu »* — la première
 *    correction avait mis SEPT écrans de lecture avant le premier son.
 *
 * La sortie n'était pas de raccourcir le prologue (c'est lui qui rend le reste
 * lisible) mais de l'ENTRELACER : quatre écrans posent le strict nécessaire —
 * le label, Sol, l'échéance, l'incident — puis on joue. Ce qui reste
 * d'exposition (l'économie des sonneries, la première paie) revient ENTRE les
 * exercices, où il est en plus motivé : on explique les onze centimes après
 * avoir écouté des sons, pas avant.
 *
 * Le premier exercice tombe donc au 5e écran au lieu du 8e.
 */
const PROLOGUE: Etape[] = [
  {
    kind: 'recit',
    source: 'lcd',
    entete: 'FACE B',
    lignes: [
      'Label indépendant fondé en 1989.',
      'Quatorze artistes au catalogue.',
      'Zéro en activité.',
      'Quatre cent mille disques vendus en 1996.',
      'Mille huit cents l’an dernier.',
      'Il reste trois pièces au-dessus d’une laverie.',
      // Le mot « sonneries » doit être posé AVANT le message du répondeur, qui
      // parle du sous-traitant « qui fabrique les sonneries » : sinon l'incident
      // arrive dans un métier qu'on n'a pas encore nommé. Les chiffres, eux,
      // attendent l'écran d'après le premier exercice.
      'Le label ne vit plus des disques. Il vit des sonneries.',
    ],
  },
  /* ⚠️ Sol a son écran, et il a fallu un retour pour qu'elle l'ait :
   * *« on ne présente pas Sol ? »*. Elle dit presque toutes les répliques du
   * jeu et n'avait qu'une demi-phrase — « Sol dirige le label » — glissée dans
   * l'écran qui parlait du JOUEUR. Même défaut que le prologue manquant, un
   * cran plus fin : `HISTOIRE.md` ne la présente pas davantage, parce qu'un
   * lecteur arrivé là a lu les trente lignes précédentes.
   *
   * Elle se présente par ce qu'elle FAIT, jamais par une description — c'est la
   * règle de style du récit, et c'est ce qui la rend drôle.
   *
   * ⚠️ Son prénom complet vient d'une demande de Yann (« il faut rappeler son
   * nom bien franchouillard ») et n'existe nulle part dans `HISTOIRE.md` :
   * Solange Vasseur est une proposition, pas une reprise — nom de famille
   * compris, ajouté à sa demande. Un seul endroit à changer si un autre est
   * retenu : il n'apparaît qu'ici.
   *
   * ⚠️ Et elle passe AVANT tout dialogue : le premier « — » du prologue est à
   * l'écran suivant. Placée après, elle parlait avant d'exister ; c'est le test
   * `présente Sol avant de lui donner la parole` qui l'avait attrapé. */
  {
    kind: 'recit',
    source: 'lcd',
    entete: 'SOL',
    lignes: [
      'Sol dirige le label.',
      'Sur les statuts, c’est Solange Vasseur.',
      'Sur les pochettes, ç’a toujours été Sol.',
      'Le syndicat lui envoie des cartons d’autocollants :',
      'LE PIRATAGE TUE LA MUSIQUE.',
      // ⚠️ Chaque ligne doit tenir sur UNE ligne d'afficheur à 390 px : le récit
      // est écrit en une idée par ligne, un repli casse le rythme et se lit
      // comme du texte courant. Mesuré à la capture — ~55 signes.
      'Elle s’en sert pour caler la fenêtre, qui ferme mal.',
    ],
  },
  {
    kind: 'recit',
    source: 'lcd',
    entete: 'LE 14 JUIN',
    lignes: [
      'Une grosse maison propose de racheter Face B.',
      'Les albums, les droits, les bandes et le nom.',
      'Sol a jusqu’au 14 juin pour accepter.',
      '— Je vais vendre.',
      '— Alors pourquoi on travaille encore ?',
      '— Parce que je ne vais quand même pas',
      'ne rien faire jusqu’en juin.',
    ],
  },
  /* Le dernier écran avant de jouer : l'incident, et le joueur, dans le même
   * souffle. « Tu es stagiaire, tu fais le café » vivait sur un écran à lui —
   * il tient en deux lignes et prépare directement la réplique qui ouvre le
   * premier exercice. */
  {
    kind: 'recit',
    source: 'repondeur',
    entete: 'MESSAGE — 11 s',
    lignes: [
      'Le sous-traitant qui fabrique les sonneries arrête.',
      'Il laisse un dossier et un mot de passe.',
      'Le mot de passe ne marche pas.',
      'Sol essaie trois fois. Il ne répond plus.',
      '— Il va falloir tout refaire.',
      'Toi, tu es stagiaire. Tu fais le café.',
      // ⚠️ Ce que le joueur va devoir entendre est NOMMÉ ici, avant qu'on le
      // lui demande. Cette ligne vivait après les trois exercices — on faisait
      // donc reconnaître des choses sans les avoir nommées, alors que
      // l'Atelier, où vivent les boutons, n'est même pas encore ouvert.
      'Sol se tourne vers toi.',
      '— Approche. Écoute, et tape avec.',
    ],
  },
];

/** Combien d'étapes de l'acte 0 sont du prologue. La vue s'en sert pour ne
 *  montrer le carnet et le compte à rebours qu'une fois qu'ils ont un sens. */
export const LONGUEUR_PROLOGUE = PROLOGUE.length;

/** L'étape où le 14 juin est expliqué : le compte à rebours apparaît là, et
 *  pas avant. Un décompte vers une date inconnue n'est pas une tension, c'est
 *  un nombre. */
export const ETAPE_DU_COMPTE_A_REBOURS = 2;

export const ACTES: Acte[] = [
  {
    id: 0,
    titre: 'LE CAFÉ',
    quand: 'Cinq mois avant',
    jours: JOURS[0],
    competence: 'ecoute',
    competenceLabel: 'ÉCOUTE',
    module: null,
    resume: 'Le sous-traitant s’en va. Quatre ans de sonneries sont perdus.',
    etapes: [
      ...PROLOGUE,
      /* ⚠️ L'acte 0 se joue avec les MAINS, pas avec un questionnaire.
       *
       * Il posait quatre questions à choix multiples : trois `lequel` (la
       * hauteur, la durée, l'intensité, les quatre mots de `HISTOIRE.md`) et
       * le `silence`. Demande de Yann : *« l'acte 0 est à refaire à 0, il faut
       * enlever les questions "lequel", mettre les questions de tap »*.
       *
       * Ce qui change n'est pas la difficulté, c'est la NATURE de ce qu'on
       * demande. `lequel` demande un jugement — « laquelle sonne la plus
       * grave ? » — à quelqu'un qui n'a encore rien touché et à qui aucun
       * bouton n'a été montré : c'est un test d'entrée. `jouer` demande un
       * geste que tout le monde a déjà : taper avec ce qu'on entend. Le
       * premier écran du jeu met donc les mains sur la machine au lieu de
       * faire remplir un formulaire.
       *
       * Ce qui est perdu — les trois mots hauteur / durée / intensité — n'est
       * pas perdu : ils sont enseignés à l'acte 2, par `nommer` et `regler`,
       * c'est-à-dire à l'écran qui porte enfin les boutons correspondants. Les
       * niveaux 49, 50 et 51 restent au réservoir (un niveau ne se supprime
       * jamais, il cesse d'être cité) : la salle de répétition les proposera
       * dès qu'un acte les rencontre.
       *
       * Le `silence` (niveau 52), lui, reste : ce n'est pas un `lequel`, il ne
       * demande aucun vocabulaire, et il est le contrepoint exact des trois
       * exercices de frappe — on vient de taper ce qu'on entend, on va
       * maintenant montrer ce qu'on n'entend PAS. */
      {
        kind: 'exercice',
        niveau: 64,
        commande: '— Tu fais quoi exactement ici ? — Le café. — Je sais. Écoute ça, et tape avec.',
      },
      {
        kind: 'recit',
        source: 'fax',
        entete: 'CE QUI FAIT VIVRE FACE B',
        lignes: [
          'Douze secondes, trois euros, par SMS surtaxé.',
          'TAPEZ FACEB AU 61000.',
          '— Sur les trois euros,',
          'il nous en revient onze centimes.',
          '— C’est peu.',
          '— C’est onze centimes de plus qu’un album.',
        ],
      },
      {
        kind: 'exercice',
        niveau: 65,
        commande: '— Recommence. Il y a un coup de plus, et il ne tombe pas sur un temps.',
      },
      /* L'écran qui prépare « à vue » — et, sans en avoir l'air, tout l'acte 1.
       * Le joueur voit la grille pour la première fois ici, dessinée sur du
       * papier : quand l'Atelier s'ouvrira, il saura déjà ce qu'il regarde. */
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'LA GRILLE',
        lignes: [
          'Elle sort une feuille quadrillée du tiroir.',
          'Une colonne par croche, une croix par coup.',
          '— C’est comme ça qu’on les écrit.',
          '— Et on les lit comment ?',
          '— Comme ça.',
          'Elle tape sur la table en suivant les croix.',
        ],
      },
      {
        kind: 'exercice',
        niveau: 66,
        commande: '— Là je coupe le son du kick. Tu l’as sous les yeux : joue-le.',
      },
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'SOL',
        lignes: [
          'Elle te regarde comme si la plante verte venait de parler.',
          '— Lundi tu fais les sonneries.',
          '— Encore une chose.',
        ],
      },
      {
        kind: 'exercice',
        niveau: 52,
        commande: '— Ce qu’on n’entend pas compte autant. Où est le trou ?',
      },
      {
        kind: 'recit',
        source: 'fax',
        entete: 'COMMANDE — AGRÉGATEUR',
        lignes: [
          'Cinq sonneries monophoniques, pour remplacer les perdues.',
          'Douze secondes avec trois sons.',
          'Tu livres. C’est objectivement mauvais.',
          'Une des cinq est mise en ligne.',
          'Relevé de fin de mois : NEUF EUROS.',
          '— Voilà. Tu es officiellement',
          'dans l’industrie musicale.',
        ],
      },
    ],
  },
  {
    id: 1,
    titre: 'LE RYTHME',
    quand: 'Quatre mois avant',
    jours: JOURS[1],
    competence: 'rythme',
    competenceLabel: 'RYTHME',
    module: 'atelier',
    resume: 'Un brief que personne ne sait expliquer. Kick, snare, hi-hat.',
    etapes: [
      /* ⚠️ L'acte ouvrait sur DEUX écrans de lecture — le brief, puis « Sol
       * t'apprend la grille » : quatre mots sur un afficheur, pour un écran
       * entier. Les trois mots tiennent dans le brief, où ils sont en plus
       * motivés (c'est la réponse de Sol au client qui ne sait pas ce qu'il
       * veut). Même règle que l'entrelacement du prologue : ce qui peut tenir
       * dans l'écran d'à côté n'a pas besoin du sien. */
      {
        kind: 'recit',
        source: 'fax',
        entete: 'BRIEF — CLIENT',
        lignes: [
          'QUELQUE CHOSE QUI FAIT SÉRIEUX',
          'MAIS QUI DONNE ENVIE DE BOUGER.',
          '— Ça veut dire quoi ?',
          '— Ça veut dire qu’ils ne savent pas.',
          'Sol pose trois mots sur la table :',
          'Kick. Snare. Hi-hat.',
          '— Le reste, c’est de la décoration.',
        ],
      },
      /* ⚠️ Le niveau 1 a sauté — « niveau 1 à supprimer, on peut passer au
       * niveau 2 directement » (Yann). Il ne faisait poser que des kicks, sur
       * une grille où les deux autres lignes étaient explicitement vides : un
       * écran où il n'y a rien à arbitrer. Le niveau reste dans le réservoir,
       * la carrière ne le cite plus. */
      /* ⚠️ UN SUJET, UN EXERCICE — et c'est l'INVERSE de la règle du
       * 2026-08-31, révoquée par la relecture complète : *« l'acte 1 fusionné
       * 12 → 6-7, le niveau 2 retiré, plus une polyrythmie »* (Yann).
       *
       * La série de douze doublait chaque sujet : un exercice le POSAIT, le
       * suivant l'exigeait ailleurs. Ce que ça donnait à jouer, c'est deux
       * lectures de seize cases pour une seule idée neuve — et l'acte
       * s'étirait sans monter. Chaque sujet garde donc son exercice le plus
       * DENSE, celui qui demande le plus de travail : la base (67), le charley
       * en doubles-croches (68), la syncope partout (69), la polyrythmie (74),
       * les deux variantes ensemble (60), les rafales (8), puis tout (61).
       *
       * Les niveaux 2, 3, 5, 7, 59 et 70 restent au réservoir — un niveau ne se
       * supprime jamais, il cesse d'être cité. Le 2 est nommément retiré : à
       * douze cases, il était le plus léger de la carrière.
       *
       * ⚠️ La polyrythmie se pose APRÈS la syncope et AVANT les variantes.
       * Après, parce que c'est la même idée d'un cran plus loin — une ligne qui
       * ne tombe plus là où on l'attend, puis une ligne qui ne compte même plus
       * comme les autres. Avant, parce que la résolution ne redescend jamais
       * (44 cases, entre les 32 du 69 et les 48 du 60). */
      { kind: 'exercice', niveau: 67, commande: 'La première sonnerie. Le kick tient les quatre temps, la claire répond sur 2 et 4.' },
      { kind: 'exercice', niveau: 68, commande: 'Le charley par-dessus, et tout de suite à la double-croche : seize cases pour lui seul.' },
      { kind: 'exercice', niveau: 69, commande: 'Maintenant le kick sort du temps — deux fois — et la claire s’y met aussi. Plus rien n’est où tu l’attends.' },
      { kind: 'exercice', niveau: 74, commande: 'Et si une ligne ne comptait plus comme les autres ? La claire boucle en douze, les deux autres en seize.' },
      /* ⚠️ Les variantes et les rafales atterrissent ICI, et c'est un
       * déménagement demandé : elles vivaient à l'acte 2, où « on ne comprend pas
       * pourquoi il y a les rafales et les charleys ouverts, rim shot,
       * personne n'explique, ce n'est pas lié au groove » (Yann). Ce sont deux
       * gestes de GRILLE — un deuxième clic, un appui long — donc deux gestes
       * de l'acte qui enseigne la grille. Et quelqu'un les explique : Sol les
       * fait, à l'écran, avant qu'on les demande. */
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'SOL',
        lignes: [
          '— C’est juste, et c’est plat.',
          'Elle reclique sur une case déjà allumée.',
          'La snare devient un rim shot : le bord, pas la peau.',
          'Elle appuie longuement sur une autre.',
          'Le coup part en rafale, trois fois plus vite.',
          '— Deux gestes. C’est tout ce qui sépare',
          'une sonnerie d’un réveille-matin.',
        ],
      },
      /* ⚠️ Trois exercices après la leçon de Sol, et non plus cinq : le rim
       * shot et l'ouverture du charley ne s'apprennent plus séparément avant
       * d'être réunis, ils arrivent ENSEMBLE (60), parce que Sol vient de faire
       * les deux gestes à l'écran. Puis la rafale (8), puis tout (61).
       *
       * Ce qui reste vrai de la passe du 2026-08-27 (« monter en difficulté
       * l'acte 1 ») : ces trois-là sont les plus denses de la série, quarante-
       * huit cases chacun. Ce qui a changé, c'est qu'on n'y arrive plus par une
       * marche d'escalier par nouveauté. */
      { kind: 'exercice', niveau: 60, commande: 'Les deux gestes de Sol dans le même rythme — deux rim shots, trois ouvertures.' },
      { kind: 'exercice', niveau: 8, commande: 'Quatre rafales, deux longueurs, deux lignes. Compte les coups.' },
      { kind: 'exercice', niveau: 61, commande: 'Le dernier. Tout ce que tu sais, dans une mesure — et rien au singulier.' },
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'RELEVÉ DU MOIS',
        lignes: [
          'La dernière prend.',
          'QUATRE-VINGT-ONZE EUROS.',
          '— On était meilleurs quand on vendait des albums.',
          '— Vous avez arrêté pourquoi ?',
          '— Nous, on n’a pas arrêté.',
          'Les gens ont arrêté d’acheter.',
        ],
      },
      /* La LIVRAISON — et c'est elle qui ouvre l'Atelier, pas un écran de fin
       * d'acte. « Sortir une vraie sonnerie de téléphone avec […] ce qui peut
       * être drôle, c'est de l'exporter et de proposer d'en faire la sonnerie de
       * son téléphone/réveil matin » (Yann). Le déverrouillage cesse d'être une
       * annonce : on entre dans l'Atelier avec le rythme qu'on vient de faire,
       * et l'export MP3 — qui existe depuis toujours — trouve enfin son
       * moment. */
      {
        kind: 'livraison',
        entete: 'FB — TA SONNERIE',
        titre: 'TA SONNERIE',
        client: 'FACE B',
        lignes: [
          'Sol fait glisser une clé sur la table.',
          '— La dernière, elle est à toi. Emporte-la.',
          'L’ATELIER EST OUVERT.',
          'Ton rythme s’y ouvre tel quel.',
          'Exporte-le en MP3, mets-le sur ton téléphone :',
          'c’est ta sonnerie, ou ton réveil.',
          '— Et le lundi matin, tu penseras à nous.',
        ],
        bouton: 'Emporter ma sonnerie ▸',
      },
    ],
  },
  {
    id: 2,
    titre: 'LE GROOVE',
    quand: 'Trois mois avant',
    jours: JOURS[2],
    competence: 'groove',
    competenceLabel: 'GROOVE',
    module: null,
    resume: 'Kelvin a seize ans, il vient le mardi, et il trouve ça nul.',
    etapes: [
      /* ⚠️ TROIS ARBITRAGES SUCCESSIFS, et il faut les garder tous les trois —
       * ne pas « restaurer » l'un en croyant corriger l'autre.
       *
       * 1. (2026-08-27) « Pour le groove, on ne comprend pas pourquoi il y a
       *    les rafales et les charleys ouverts, rim shot ; ce n'est pas lié au
       *    groove. Le groove, ce sont des paramètres qu'on doit pouvoir
       *    régler. » → l'acte passe aux verbes de PARAMÈTRE, et ses grilles
       *    n'apportent ni variante ni rafale.
       * 2. (plus tard) « Les quiz sont moins intéressants que les exercices de
       *    reproduction. » → les grilles reviennent, écrites.
       * 3. (2026-09-01, relecture complète) *« les rythmes se ressemblent
       *    trop »* — cinq fois — et *« les autres verbes ne sont pas forcément
       *    tous intéressants : lequel, régler et nommer »*, avec une consigne
       *    d'ordre : **régler en premier**, et **l'aléa dans le cahier**.
       *
       * Ce que le 3 change, et pourquoi ça ne contredit pas le 2 : le TRIO
       * comparatif (14, 17, 23 sur une seule grille) est dissous. Comparer
       * deux balancements ne demandait pas trois reproductions — un curseur
       * qu'on vise contre une cible le dit mieux, et c'est `regler`. Chaque
       * sujet s'ouvre donc sur son réglage et se referme sur UNE grille, toutes
       * différentes ; les trois `lequel` sortent (désigner A ou B est le même
       * jugement, en moins engageant) ; les deux exercices d'aléa sortent aussi
       * et deviennent une exigence du cahier de Kelvin, où l'on POSE l'aléa au
       * lieu de le reconnaître.
       *
       * Les niveaux 17, 45, 46, 62 et 73 restent au réservoir : un niveau ne se
       * supprime jamais, il cesse d'être cité.
       *
       * `nommer` reste, une fois : c'est le seul écran du jeu qui met les deux
       * mots côte à côte, et l'Atelier est ouvert depuis l'acte 1 — les mots
       * « Swing » et « Décalage » sont sur des curseurs déjà vus. À l'acte 0 ils
       * ne renvoyaient à rien.
       *
       * La traîne (`drag`) n'y est pas, et c'est un choix : elle est GLOBALE
       * dans le format v2 (un seul champ pour tout le morceau), donc
       * impossible à faire entendre ligne par ligne sans mentir sur ce qu'on
       * règle. Voir `parametres.ts`. */
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'LE MARDI',
        lignes: [
          'Kelvin a seize ans. Il fait du rap.',
          'Il n’a jamais rien sorti, il ne montre jamais ses textes.',
          'Il te demande une boucle. Tu lui donnes ta plus propre.',
          '— C’est nul.',
          '— Pourquoi ?',
          '— Ça fait réveil.',
          'Il tape du doigt sur la table, à côté du temps.',
          '— C’est carré. Personne ne danse carré.',
        ],
      },
      /* ⚠️ Le mot AVANT le curseur. Le récit nomme le swing, puis on le règle,
       * puis on le repose dans une grille — un exercice n'enseigne que ce qu'un
       * écran a déjà expliqué, et c'est d'autant plus vrai depuis que les
       * `lequel` d'écoute sont partis. */
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'SOL',
        lignes: [
          'Sol, sans lever les yeux : — Il a raison.',
          '— Ça s’appelle le swing.',
          'Un temps sur deux arrive un peu en retard.',
          'Toujours le même, toujours du même retard.',
          '— Et c’est réglable ?',
          '— Tout est réglable. C’est bien le problème.',
        ],
      },
      /* ⚠️ RÉGLER D'ABORD, REPOSER ENSUITE — l'ordre demandé par Yann. Viser
       * un curseur contre une cible remplace le `lequel` qui ouvrait l'acte :
       * c'est le même jugement d'oreille, mais on le pose au lieu de le
       * désigner, et c'est le geste qu'on refera dans l'Atelier. */
      {
        kind: 'exercice',
        niveau: 48,
        commande: 'Trouve-le au curseur. Pas le chiffre : le balancement.',
      },
      {
        kind: 'exercice',
        niveau: 14,
        commande: 'Maintenant tiens-le sur seize cases. Ce n’est plus de l’entendre, c’est de le poser.',
      },
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'KELVIN',
        lignes: [
          'Il refait le geste du doigt sur la table.',
          '— Comme ça.',
          '— Ça fait combien, « comme ça » ?',
          '— J’en sais rien. Comme ça.',
          'Sol : — Il y en a un autre. Là, c’est la ligne entière qui glisse.',
          '— Le kick, lui, ne bouge pas. C’est contre lui qu’on l’entend.',
        ],
      },
      {
        kind: 'exercice',
        niveau: 71,
        commande: 'Celui-là aussi se règle. De quel côté glisse-t-il, et de combien ?',
      },
      /* ⚠️ Une AUTRE grille, et c'est le sujet de la passe du 2026-09-01 : ce
       * niveau reprenait celle du 14 case pour case. */
      {
        kind: 'exercice',
        niveau: 23,
        commande: 'Une autre boucle, sans balancement — mais le charley traîne derrière. Repose-la.',
      },
      {
        kind: 'exercice',
        niveau: 47,
        commande: 'Kelvin en a repéré deux. Il ne sait pas les nommer. Toi, si.',
      },
      /* La seule grille où les DEUX feels jouent ensemble : les deux exercices
       * précédents les isolent, celle-ci les cumule. */
      {
        kind: 'exercice',
        niveau: 72,
        commande: 'Les deux sur la même ligne : le charley balance ET traîne. Repose-la.',
      },
      /* ⚠️ L'ALÉA n'a plus d'exercice — il est dans le CAHIER, en bas de l'acte.
       * Les niveaux 62 et 73 faisaient reconnaître trois boutons ; la commande
       * demande de les POSER, ce qui est la seule façon d'apprendre à quoi ils
       * servent. Le récit garde ce qu'ils avaient d'utile : le mot, et
       * l'idée. */
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'SOL',
        lignes: [
          '— Il reste un truc, et c’est celui qu’on n’écrit pas.',
          '— La machine peut jouer à côté toute seule :',
          'des coups en plus, ou pas toujours la même force.',
          '— Ghost notes, vélocité, rafales. Trois boutons.',
          '— C’est ce qui sépare une boîte à rythmes d’un batteur.',
          '— Et ça, tu ne le reconnaîtras qu’en l’ayant mis toi-même.',
        ],
      },
      /* ⚠️ LE PALIER — retour de testeur : « le jeu reste trop longtemps trop
       * facile ». Mesuré : l'acte 1 finissait à 24 cases avec deux variantes,
       * et l'acte 2 n'avait jamais dépassé 24 cases sans variante. Il était un
       * cran EN ARRIÈRE, et le premier exercice plus dur que la fin de l'acte 1
       * n'arrivait qu'au 33e sur 42.
       *
       * Ce niveau double la résolution (seize cases par ligne) et devient le
       * point de départ de la commande : c'est la boucle que Kelvin a en tête,
       * et c'est elle qu'on transforme juste après. */
      {
        kind: 'exercice',
        niveau: 63,
        commande: 'Kelvin repose la cassette. — Celle-là. C’est celle-là que je veux, mais elle bouge pas assez.',
      },
      {
        kind: 'commande',
        entete: 'KELVIN — IL ATTEND SA BOUCLE',
        lignes: [
          '— Bon. Tu me la refais ?',
          'Il ne dira pas ce qu’il veut : il ne sait pas le dire.',
          'Il saura le reconnaître.',
          'Va dans l’Atelier. Fais-en une qui respire.',
        ],
        bouton: 'Ouvrir l’Atelier ▸',
        /* ⚠️ L'Atelier s'ouvre SUR le rythme du niveau 63 — celui que le
         * joueur vient de reproduire, celui que Kelvin a en tête. Le travail
         * n'est plus « fais-en une », c'est « transforme celle-là ».
         *
         * Le cahier est donc écrit contre ce point de départ : le rythme de
         * départ ne satisfait AUCUNE des trois exigences. Kick sur 1 et 3
         * (donc jamais entre deux temps), charley sur les huit cases (donc
         * aucune place), pas une variante. La check-list s'ouvre à 0/3 et
         * chaque case demande un vrai geste — c'est la condition qui remplace
         * « l'Atelier part vide ». `tests/transformer.test.ts` la tient. */
        partirDu: 63,
        /* ⚠️ SIX lignes depuis le 2026-09-01, et les deux dernières sont la
         * leçon de l'acte : *« l'aléa dans le cahier »* (Yann). L'acte
         * enseignait le décalage et les trois boutons d'aléa par des quiz, et
         * sa commande n'en demandait rien — on pouvait donc traverser l'acte du
         * GROOVE et livrer une boucle carrée, c'est-à-dire exactement ce que
         * Kelvin refuse au premier écran (« ça fait réveil »).
         *
         * ⚠️ Le swing, lui, n'est PAS exigé : la grille de départ (niveau 63)
         * en porte déjà 20, donc la case serait cochée à l'ouverture — le
         * défaut que `tests/transformer.test.ts` interdit. Ce qu'on demande est
         * ce que le départ n'a pas : une ligne qui glisse contre les autres. */
        cahier: [
          pasLeMotifDeDepart(DEPART_KELVIN, 'Il faut y avoir touché'),
          kickQuiSortDuTemps('Fais bouger le kick — qu’il sorte du temps'),
          dePlacePourLaVoix('Laisse de la place : le charley ne joue pas tout'),
          auMoinsUneVariante('Quelque chose qui ne se répète pas — rim shot ou charley ouvert'),
          uneLigneQuiGlisse(6, 'Une ligne qui glisse contre les autres — et une qui ne bouge pas'),
          deLAlea('Que la machine ne joue pas deux fois pareil — un des trois boutons'),
        ],
        accepte: '— Là. Ça respire. Tu vois quand tu veux.',
        titre: 'SANS TITRE',
        client: 'KELVIN',
      },
      {
        kind: 'recit',
        source: 'cassette',
        entete: 'KELVIN — SANS TITRE',
        lignes: [
          'Tu refais la boucle. Kelvin pose dessus.',
          'Pour la première fois, il te laisse écouter son texte.',
          'Il n’est pas mauvais. Il est même plutôt bon.',
          '— Tu vois ? Là, ça respire.',
          'Tu viens de comprendre quelque chose',
          'que les cases ne t’apprennent pas.',
        ],
      },
    ],
  },
  {
    id: 3,
    titre: 'LA MÉLODIE',
    quand: 'Deux mois avant',
    jours: JOURS[3],
    competence: 'melodie',
    competenceLabel: 'MÉLODIE',
    module: 'synth',
    resume: 'Une pub refusée, rachetée par le voisin du dessous.',
    etapes: [
      {
        kind: 'recit',
        source: 'fax',
        entete: 'BRIEF — AGENCE DE PUBLICITÉ',
        lignes: [
          'Les téléphones polyphoniques arrivent.',
          'Une sonnerie peut contenir plusieurs notes.',
          'Une agence commande un jingle pour une lessive :',
          'PROPRE, RAPIDE, FAMILIAL,',
          'MAIS PAS TROP FAMILIAL.',
          'Tu fais plusieurs essais. Tous corrects. Aucun ne plaît.',
        ],
      },
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'RACHID, LA LAVERIE DU BAS',
        lignes: [
          'Il les entend passer dans la cage d’escalier.',
          '— Ça, ça fait dentiste.',
          '— Ça, ça fait linge sale.',
          '— Ça fait linge propre chez quelqu’un d’autre.',
          '— Et tu veux quoi ?',
          '— Quelque chose qui donne envie de rentrer chez soi.',
        ],
      },
      {
        kind: 'exercice',
        niveau: 42,
        commande: 'Tu commences par la mélodie — c’est elle qu’on fredonne. Les hauteurs, une par une.',
      },
      {
        kind: 'exercice',
        niveau: 43,
        commande: 'Puis la basse, dessous. Elle se répète : c’est ce qui la rend tenable.',
      },
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'L’AGENCE',
        lignes: [
          'Tu fais une petite mélodie.',
          'L’agence la refuse comme les autres.',
          'Ils ne prendront rien, et ils ne paieront rien.',
          'Rachid, lui, l’a entendue dans l’escalier.',
          '— Ça.',
          '— Pourquoi ?',
          '— Je sais pas.',
          'Il sort son portefeuille. — C’est combien ?',
        ],
      },
      {
        kind: 'exercice',
        niveau: 44,
        commande: 'La deuxième, celle qu’il réclame. Toute la gamme, seize pas, aucune reprise.',
      },
      /* ⚠️ L'ACTE SE TERMINE EN TROIS ENVOIS — refait le 2026-09-01, sur la même
       * demande que l'acte 4 : *« il faut que tout soit en atelier avec des
       * cahiers des charges assez complexes »* (Yann, relecture complète), et
       * une consigne d'ordre pour celui-ci — *« mélodie, basse, nappe,
       * additionnées, plus les textures »*.
       *
       * Ce que l'acte avait : une commande de trois lignes (« une basse », « de
       * quoi tenir le temps ») qu'un morceau quelconque satisfaisait. Ce qu'il
       * a : le MÊME jingle renvoyé trois fois, une couche à la fois.
       *
       * ⚠️ Les trois exercices de mélodie RESTENT, contrairement à l'acte 4 où
       * les cinq sont partis. Ce ne sont pas des quiz : on y écrit des notes
       * avec le clavier de l'Atelier, c'est-à-dire exactement le geste que les
       * trois envois demandent ensuite. Ils enseignent le mot « degré » sans
       * lequel « la dernière note est la tonique » ne voudrait rien dire.
       *
       * ⚠️ Aucun envoi n'interdit de toucher aux couches précédentes : les
       * contraintes sont RELATIONNELLES (« la basse tient sous la mélodie »,
       * « la nappe passe derrière »), donc effacer une couche rend la suivante
       * insatisfiable. Une interdiction aurait dit la même chose en punissant
       * l'essai, ce que l'Atelier n'a pas à faire. */
      {
        kind: 'commande',
        entete: 'RACHID — PREMIER ENVOI',
        lignes: [
          '— C’est combien ?',
          '— Vous voulez quoi, exactement ?',
          '— Ce que j’ai entendu dans l’escalier.',
          'C’est tout le brief. Il n’y en aura pas d’autre.',
          'Une phrase, et de quoi la faire tenir debout.',
        ],
        bouton: 'Ouvrir l’Atelier ▸',
        // Le cahier demande une ligne de synthé : le Synthé s'ouvre pour elle.
        modulesRequis: ['synth'],
        cahier: [
          ...dansLaSection(LA_PHRASE, [
            AVOIR_PRODUIT,
            pasUnPresetCharge('Ta phrase — pas un preset chargé depuis le menu'),
            unePhrase('melody', 4, 3, 'Une vraie phrase : quatre notes au moins, trois hauteurs différentes'),
            seReposeSurLaTonique('melody', 'Elle se repose : la dernière note est la tonique (degré 1)'),
            lignesPresentes(['kick', 'snare'], 'De quoi tenir le temps dessous'),
          ]),
        ],
        accepte: '— Ça. Je sais pas pourquoi. C’est combien ?',
        titre: 'JINGLE LAVERIE',
        client: 'RACHID',
      },
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'SOL',
        lignes: [
          '— Il l’a prise. Elle est maigre.',
          '— Elle lui plaît.',
          '— Elle plaira moins la deux-centième fois.',
          'Elle pose un doigt sous la ligne.',
          '— Une mélodie toute seule, c’est un sifflement.',
          '— Mets ce qu’il y a dessous. La basse ne rejoue pas la mélodie :',
          '— elle la porte. Moins de notes, et le premier temps.',
        ],
      },
      {
        kind: 'commande',
        entete: 'RACHID — DEUXIÈME ENVOI',
        lignes: [
          'Le même jingle, repris là où tu l’as laissé.',
          '— Dans la machine, on n’entend que le haut.',
          '— Il faut que ça descende.',
          'Sol traduit : une basse qui tient, et un son choisi pour elle.',
        ],
        bouton: 'Reprendre le jingle ▸',
        modulesRequis: ['synth'],
        /* Il REPART de ce qui vient d'être livré. Le cahier n'exige donc rien
         * de la mélodie — elle est déjà acceptée — mais la basse se mesure
         * CONTRE elle, ce qui suffit à la protéger. */
        partirDeLaLivraison: true,
        cahier: [
          ...dansLaSection(LA_BASSE, [
            ligneSynthPresente('bass', 'Une basse — c’est elle qui pose le sol'),
            poseLePremierTemps('bass', 'Elle pose le premier temps — c’est le repère'),
            basseQuiTient('Elle TIENT : moins de notes que la mélodie, pas une course'),
            voixChoisie(['bass'], 'Choisis-lui une voix : ronde, pincée, profonde'),
          ]),
        ],
        accepte: '— Là on l’entend depuis le fond du magasin.',
        titre: 'JINGLE LAVERIE (V2)',
        client: 'RACHID',
      },
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'SOL',
        lignes: [
          '— C’est juste. C’est nu.',
          'Elle ouvre la troisième ligne.',
          '— La nappe, c’est ce qu’il y a derrière.',
          '— On ne l’écoute jamais. On la remarque quand elle part.',
          '— Et elle ne reste pas un bloc : elle bouge, un peu.',
          '— Dernière chose : arrête de tout laisser sur la voix d’usine.',
          '— Une note, ce n’est pas un son. Choisis-lui un son.',
        ],
      },
      {
        kind: 'commande',
        entete: 'RACHID — TROISIÈME ENVOI',
        lignes: [
          'Toujours le même jingle. C’est le dernier aller-retour.',
          '— Il va tourner huit heures par jour.',
          '— Il faut qu’on le supporte encore le soir.',
          'De la chaleur derrière, et un son choisi pour chaque ligne.',
        ],
        bouton: 'Reprendre le jingle ▸',
        modulesRequis: ['synth'],
        partirDeLaLivraison: true,
        cahier: [
          ...dansLaSection(LA_NAPPE, [
            ligneSynthPresente('pad', 'Des accords qui tiennent derrière'),
            nappeQuiRespire('Elle ne reste pas un bloc : arpège, bourdon ou étalement'),
          ]),
          ...dansLaSection(LES_TEXTURES, [
            voixChoisie(['melody', 'pad'], 'Une voix choisie pour la mélodie ET pour la nappe'),
            duGlide('bass', 0.15, 'La basse glisse d’une note à l’autre — un peu de glide'),
          ]),
        ],
        accepte: '— Trois semaines plus tard, les clients le fredonnent.',
        titre: 'JINGLE LAVERIE (V3)',
        client: 'RACHID',
      },
      {
        kind: 'recit',
        source: 'cassette',
        entete: 'FB — JINGLE LAVERIE',
        lignes: [
          'Le plus grand succès du catalogue est un rebut de publicité',
          'racheté par le voisin du dessous.',
          'Il passe huit heures par jour, six jours sur sept.',
          'Trois semaines plus tard, les clients le fredonnent.',
          'Des mois après, tu en proposes une quatrième version.',
          'Elle tourne quatre jours. Trois clientes se plaignent.',
          'Rachid remet la troisième et n’en reparle plus.',
        ],
      },
    ],
  },
  {
    id: 4,
    titre: 'LA PRODUCTION',
    quand: 'Six semaines avant',
    jours: JOURS[4],
    competence: 'production',
    competenceLabel: 'PRODUCTION',
    module: 'production',
    resume: 'Ça sonne bien ici et mal partout ailleurs.',
    etapes: [
      /* ⚠️ L'ACTE REFAIT LE 2026-09-01 — cinq exercices supprimés, trois envois
       * à la place. Relecture de Yann, sur chacun des cinq : *« NOK »*, et sur
       * l'acte : *« ça ne marche pas l'exercice du petit haut-parleur, cet
       * élément de scénario ne tient pas la route. Il faudrait démarrer par
       * l'atelier avec un cahier des charges progressif et au niveau de
       * difficulté poussé, toucher à beaucoup de composantes dont la reverb,
       * le delay, les filtres. Les livraisons intermédiaires doivent être
       * remplacées par les nouvelles jusqu'à la fin de l'acte. »*
       *
       * L'acte tient toujours sur la même phrase de `HISTOIRE.md` — « Ton
       * morceau est bon dans ton ordinateur. Ici, il est mauvais. » — mais ce
       * n'est plus un exercice qui la porte, c'est un CLIENT qui renvoie le
       * morceau trois fois. Le geste demandé remplace le mot appris : on ne
       * nomme plus un filtre, on s'en sert parce que le morceau est refusé
       * sans lui.
       *
       * ⚠️ Les niveaux 53 à 57 ne sont pas supprimés — ils restent au
       * réservoir, comme tout niveau qui cesse d'être cité. Le verbe `laverie`
       * et son étage de moteur restent eux aussi : le petit haut-parleur garde
       * sa valeur d'OUTIL d'écoute dans la Production, il perd seulement son
       * rôle d'exercice noté.
       *
       * L'EQ et la compression, que le texte cite aussi, restent hors du
       * cahier : elles sont globales dans le format v2, donc impossibles à
       * exiger ligne par ligne sans mentir sur ce qu'on demande. */
      {
        kind: 'recit',
        source: 'fax',
        entete: 'COMMANDE — LE TUNNEL',
        lignes: [
          'Une salle de trois cents places veut un morceau',
          'pour ses soirées.',
          'Première fois que tu produis quelque chose',
          'destiné à durer plus de douze secondes.',
          'Tu utilises tout : rythme, groove, mélodie.',
          'Tu livres. Ils passent le morceau samedi.',
        ],
      },
      {
        kind: 'commande',
        entete: 'LE TUNNEL — PREMIER ENVOI',
        lignes: [
          'Tu as jusqu’à samedi pour renvoyer le morceau.',
          'Trois cents personnes, un système de club.',
          '— Enlève ce qui ne sert pas.',
          '— Et mets une basse qui existe encore à la laverie.',
        ],
        bouton: 'Ouvrir l’Atelier ▸',
        chapeau: FICHE_TECHNO.chapeau,
        /* ⚠️ PREMIER des trois envois. Il ne demande QUE le morceau : le
         * mixage viendra parce que le client le renverra, pas parce qu'un
         * cahier de neuf lignes l'annonçait d'avance. C'est la différence
         * entre « voilà tout ce qu'il faut faire » et « ça ne va pas, refais ». */
        cahier: [
          ...dansLaSection(LE_MORCEAU, [
            AVOIR_PRODUIT,
            pasUnPresetCharge('Ton morceau — pas le preset chargé depuis le menu'),
            dansLeStyleFiche(FICHE_TECHNO, 'Un morceau techno — c’est un club, pas un salon'),
            lignesPresentes(['kick', 'snare', 'hat'], 'Les trois lignes qui tiennent le morceau'),
            ligneSynthPresente('bass', 'Une basse — sans elle il n’y a rien à faire danser'),
          ]),
        ],
        accepte: '— Reçu. On le passe samedi. On te rappelle.',
        titre: 'LE TUNNEL',
        client: 'LE TUNNEL',
      },
      {
        kind: 'recit',
        source: 'repondeur',
        entete: 'MESSAGE — LUNDI, 9 s',
        lignes: [
          '« Chez nous, ça n’existe pas. »',
          'Sol rappelle. — Le morceau est bien.',
          '— Alors pourquoi vous ne le gardez pas ?',
          '— Parce que personne ne bouge.',
          'Elle raccroche. Elle débranche le haut-parleur',
          'de la laverie et le pose sur la table.',
          '— Écoute le tien là-dedans.',
        ],
      },
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'SOL',
        lignes: [
          '— Tu entends ? Tout le grave est parti.',
          '— Et les trois lignes sonnent au même endroit.',
          '— Ton morceau est bon dans ton ordinateur.',
          'Elle tapote le petit boîtier.',
          '— Ici, il est mauvais. Et c’est ici qu’on l’écoute.',
          '— Je fais quoi ?',
          '— Tu enlèves, et tu ranges. Ajouter, c’est après.',
        ],
      },
      {
        kind: 'commande',
        entete: 'LE TUNNEL — DEUXIÈME ENVOI',
        lignes: [
          'Le même morceau, repris là où tu l’as laissé.',
          '— Enlève ce qui traîne en haut.',
          '— Et arrête de tout mettre au même volume :',
          'trois cents personnes ne dansent pas sur une bouillie.',
        ],
        bouton: 'Reprendre le morceau ▸',
        modulesRequis: ['production'],
        /* ⚠️ Il REPART de ce qui vient d'être livré — c'est tout le sens de la
         * chaîne. Le cahier n'exige donc rien du morceau lui-même : il est
         * déjà accepté. Il n'exige que des GESTES de mixage, et chacun est
         * borné pour ne pas se satisfaire d'un curseur poussé à fond. */
        partirDeLaLivraison: true,
        cahier: [
          filtreQuiCoupe(9000, 2, 'Enlève en haut — au moins deux lignes filtrées'),
          contrasteDeVolume(0.18, 'Range les plans : tout n’est pas au même volume'),
          kickQuiPorte(),
        ],
        accepte: '— Là ça tient. Il manque encore quelque chose, mais ça tient.',
        titre: 'LE TUNNEL (V2)',
        client: 'LE TUNNEL',
      },
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'SOL',
        lignes: [
          '— C’est propre. C’est plat.',
          '— Tu m’as dit d’enlever.',
          '— Je t’ai dit d’enlever D’ABORD.',
          'Elle pousse deux curseurs, l’un après l’autre.',
          '— La réverbe éloigne. Le delay répète.',
          '— On les confond tout le temps, et ce sont deux pièces différentes.',
          '— Maintenant tu ajoutes. Un peu.',
        ],
      },
      {
        kind: 'commande',
        entete: 'LE TUNNEL — TROISIÈME ENVOI',
        lignes: [
          'Toujours le même morceau. C’est le dernier aller-retour.',
          '— De l’espace, mais pas une cathédrale.',
          '— Un delay qui répond, pas qui bave.',
          '— Et je veux que tu aies regardé chaque ligne.',
        ],
        bouton: 'Reprendre le morceau ▸',
        modulesRequis: ['production'],
        partirDeLaLivraison: true,
        cahier: [
          reverbDosee(0.18, 0.55, 'De l’espace — et pas une cathédrale'),
          delayEngage(0.15, 'Un delay qui répond vraiment (il lui faut du retour)'),
          chaqueLigneRetouchee(
            ['kick', 'snare', 'hat'],
            'Chaque ligne a été regardée — pas seulement la plus forte',
          ),
        ],
        accepte: '— Cette fois, les gens bougent. Le lundi, ils paient.',
        titre: 'LE TUNNEL (V3)',
        client: 'LE TUNNEL',
      },
      {
        kind: 'recit',
        source: 'cassette',
        entete: 'FB — LE TUNNEL (V2)',
        lignes: [
          'Tu refais le morceau. Tu enlèves. Tu accentues.',
          'Tu renvoies.',
          'Le samedi suivant, Le Tunnel le passe.',
          'Cette fois, les gens bougent.',
          'Le lundi, ils paient.',
          '— Première fois depuis 1998 qu’un morceau de Face B',
          'fait danser quelqu’un.',
          'Elle range le chèque. — C’est pas beaucoup, mais ça compte.',
        ],
      },
    ],
  },
  {
    id: 5,
    titre: 'LES STYLES',
    quand: 'Quatre semaines avant',
    jours: JOURS[5],
    competence: 'styles',
    competenceLabel: 'CULTURE DES STYLES',
    module: null,
    resume: 'Quinze genres au catalogue, et quatre mots sur un fax.',
    etapes: [
      /* ⚠️ L'acte a l'air d'être une LISTE (quinze genres à produire) et n'en
       * est pas une : sa scène est celle du commercial qui n'arrive pas à dire
       * ce qu'il veut et finit par le fredonner. Ce qui s'apprend ici est de
       * mettre un NOM sur ce qu'on entend — d'où le verbe `style`, et non
       * quinze niveaux de reproduction qui auraient été le même exercice
       * quinze fois.
       *
       * ⚠️ REFAIT LE 2026-09-01 : *« sortir les niveaux reproduire 4/12/13/27/32
       * de l'acte 5 vers la salle de répétition, et les remplacer par des
       * commandes de style — une fiche par genre »* (Yann). Les cinq
       * reconstructions de presets étaient le même geste cinq fois, et surtout
       * le mauvais : on RECOPIAIT un genre au lieu d'en produire un. L'acte
       * livre désormais QUATRE morceaux, un par catégorie du fax — hip-hop
       * authentique (drunk beat), club énergie (garage), ambiance latino
       * (dembow), urbain festif (dancehall).
       *
       * Ce qui RESTE en reproduction est ce qui prépare une commande : le
       * carnet d'écoute (58), le garage de Londres (16) et la French touch (22)
       * avant la commande de club, le tresillo (9) et la clave (25) avant celle
       * de latino, les deux polyrythmies (29, 24) qui nomment ce dont tout ça
       * descend. Les niveaux 4, 12, 13, 27 et 32 restent au réservoir.
       *
       * ⚠️ Quatre livraisons dans un acte, et la discographie les garde toutes
       * les quatre : c'est ce qui a fait passer sa clé d'unicité de l'ACTE à
       * (acte, série) — voir `discographie.ts`. Sans ça, le joueur produisait
       * quatre genres pour n'en retrouver qu'un. */
      {
        kind: 'recit',
        source: 'fax',
        entete: 'BRIEF — ZIK’MOBILE',
        lignes: [
          'Ils vendent des sonneries dans quatorze pays.',
          'Ils veulent quinze morceaux. Pas quinze chansons :',
          'quinze STYLES. Le fax est en majuscules.',
          'HIP-HOP AUTHENTIQUE — CLUB ÉNERGIE',
          'AMBIANCE LATINO — URBAIN FESTIF',
          'Quatre catégories. Aucune précision sur lesquelles.',
        ],
      },
      {
        kind: 'recit',
        source: 'repondeur',
        entete: 'MSN — LE COMMERCIAL',
        lignes: [
          '« Festif mais urbain, vous voyez :) »',
          'Tu ne vois pas. Il insiste. Il finit par fredonner.',
          'C’est du dancehall.',
          'Tu comprends immédiatement.',
          'Il ne savait simplement pas le dire.',
          'Sol, depuis son bureau : — Voilà ton métier.',
        ],
      },
      {
        kind: 'exercice',
        niveau: 58,
        commande: 'Elle sort un carnet. Trente disques, un par genre. — Écoute.',
      },
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'SOL',
        lignes: [
          '— Tu vas les écouter.',
          '— Tous ?',
          '— Les quinze qui nous intéressent. Vite.',
          'Commence une période de travail absurde.',
          'Tu écoutes. Tu reconstruis. Tu compares. Tu recommences.',
        ],
      },
      /* ⚠️ HIP-HOP AUTHENTIQUE — la première case du fax, et la première
       * commande. Aucun exercice ne la précède, et c'est délibéré : la FICHE
       * est la leçon (elle décrit, elle juge et elle rend le détail en direct),
       * et le drunk beat se décrit en deux propriétés qu'on entend tout de
       * suite — ça balance, et ça traîne. */
      {
        kind: 'commande',
        entete: 'ZIK’MOBILE — HIP-HOP AUTHENTIQUE',
        lignes: [
          'Première case du fax, et Sol a déjà le disque prêt.',
          '— Detroit, fin des années 90. Écoute la batterie.',
          '— Elle est en retard. Volontairement.',
          '— Le gars a débranché la quantification de sa machine.',
        ],
        bouton: 'Ouvrir l’Atelier ▸',
        chapeau: FICHE_DILLA.chapeau,
        serie: 'hip-hop',
        cahier: [
          AVOIR_PRODUIT,
          pasUnPresetCharge('Ton morceau — pas le preset chargé depuis le menu'),
          dansLeStyleFiche(FICHE_DILLA, 'Ça doit sonner comme ça — le genre, pas la copie'),
        ],
        accepte: '— Voilà. C’est bancal, et c’est exactement ce qu’il faut.',
        titre: 'ZIK’MOBILE — HIP-HOP',
        client: 'ZIK’MOBILE',
      },
      /* ⚠️ Quatre presets qui dormaient dans le réservoir depuis que la
       * carrière a remplacé la campagne linéaire — l'acte des styles n'en
       * faisait rejouer que cinq sur trente. Ils sont TOUS de l'époque : le
       * garage culmine en 1997-2001, la French touch dans les années 90, le
       * tresillo et la clave n'ont pas de date.
       *
       * Les deux autres orphelins (19 gqom, 34 trap moderne) restent dehors, et
       * `tests/epoque.test.ts` le tient : leur titre NOMME un genre qui
       * n'existe pas encore en 2005. */
      { kind: 'exercice', niveau: 16, commande: 'Londres, 2001. Le garage : la caisse claire glisse, elle n’est jamais où on l’attend.' },
      { kind: 'exercice', niveau: 22, commande: 'Paris, la French touch. Le même four-on-the-floor, filtré jusqu’à l’os.' },
      {
        kind: 'commande',
        entete: 'ZIK’MOBILE — CLUB ÉNERGIE',
        lignes: [
          'Deuxième case. Le Tunnel écoutera, et ne fera pas de cadeau.',
          '— Reprends celui de Londres. Pas la grille : le SHUFFLE.',
          '— C’est lui qui fait la différence entre un club et un réveil.',
        ],
        bouton: 'Ouvrir l’Atelier ▸',
        chapeau: FICHE_GARAGE.chapeau,
        serie: 'club',
        cahier: [
          AVOIR_PRODUIT,
          pasUnPresetCharge('Ton morceau — pas le preset chargé depuis le menu'),
          dansLeStyleFiche(FICHE_GARAGE, 'Ça doit boiter comme le garage — le genre, pas la copie'),
        ],
        accepte: '— Ça boite juste. C’est le mot le plus gentil que je connaisse.',
        titre: 'ZIK’MOBILE — CLUB',
        client: 'ZIK’MOBILE',
      },
      { kind: 'exercice', niveau: 9, commande: 'Et la cellule dont tout le reste descend : trois notes, 3+3+2.' },
      { kind: 'exercice', niveau: 25, commande: 'Sa grande sœur, la clave. Sol : — Celle-là, tu la retrouveras partout.' },
      {
        kind: 'commande',
        entete: 'ZIK’MOBILE — AMBIANCE LATINO',
        lignes: [
          'Troisième case. La cellule que tu viens de reposer deux fois',
          'sert de fondation à un riddim entier.',
          '— Le 1, puis le « et » du deux. Le reste répond après le temps.',
          '— Et un shaker, tout du long, qui ne s’arrête jamais.',
        ],
        bouton: 'Ouvrir l’Atelier ▸',
        chapeau: FICHE_DEMBOW.chapeau,
        serie: 'latino',
        cahier: [
          AVOIR_PRODUIT,
          pasUnPresetCharge('Ton morceau — pas le preset chargé depuis le menu'),
          dansLeStyleFiche(FICHE_DEMBOW, 'Ça doit sonner dembow — le genre, pas la copie'),
        ],
        accepte: '— C’est ça. Quatorze pays vont danser dessus sans le savoir.',
        titre: 'ZIK’MOBILE — LATINO',
        client: 'ZIK’MOBILE',
      },
      /* ⚠️ Les polyrythmies atterrissent ICI, et pas ailleurs, parce que
       * l'acte vient de faire le tour de la famille latine et afro : le
       * tresillo, la clave, le dembow. La polyrythmie EST l'idée dont ces
       * trois-là descendent — la poser après eux, c'est nommer ce qu'on vient
       * d'entendre trois fois. Posée à l'acte 1 elle serait arrivée après le
       * rim shot, sans rien contre quoi se situer. */
      { kind: 'exercice', niveau: 29, commande: 'Sol pousse plus loin : quatre coups d’un côté, trois de l’autre, sur la même durée.' },
      { kind: 'exercice', niveau: 24, commande: 'Et trois cycles qui ne retombent ensemble qu’à la fin. — Voilà d’où vient tout ce que tu viens de refaire.' },
      {
        kind: 'commande',
        entete: 'ZIK’MOBILE — LE QUINZIÈME',
        lignes: [
          'Il en manque un. URBAIN FESTIF, dit le fax.',
          '« Festif mais urbain, vous voyez :) »',
          'Tu vois, maintenant : c’est ce qu’il a fredonné.',
          'Fais-le. Pas à l’identique — dans le genre.',
        ],
        bouton: 'Ouvrir l’Atelier ▸',
        chapeau: FICHE_DANCEHALL.chapeau,
        serie: 'urbain-festif',
        /* ⚠️ Le cahier qui a changé de nature (2026-08-26). Il demandait un
         * RANG dans `rankPresets` — et charger le preset `dancehall` depuis le
         * menu suffisait à le satisfaire, mesuré. Il demande maintenant une
         * fiche de style (`model/styles.ts`) : des critères nommés, qui se
         * cochent en direct, une tolérance visible, et une basse — que
         * `rankPresets` ne pouvait pas voir. Plus le verrou de provenance,
         * sans lequel tout le reste est décoratif. */
        cahier: [
          AVOIR_PRODUIT,
          pasUnPresetCharge('Ton morceau — pas le preset chargé depuis le menu'),
          dansLeStyleFiche(FICHE_DANCEHALL, 'Ça doit sonner dancehall — le genre, pas la copie'),
        ],
        accepte: '— C’est ça. C’est exactement ça qu’il n’arrivait pas à dire.',
        titre: 'PACK ZIK’MOBILE',
        client: 'ZIK’MOBILE',
      },
      {
        kind: 'recit',
        source: 'cassette',
        entete: 'PACK ZIK’MOBILE — 28 MAI',
        lignes: [
          'Le pack part le 28 mai. Zik’Mobile paie.',
          'Face B vient de gagner de quoi tenir un an.',
          'Sol devrait être heureuse. Elle ne l’est pas.',
          'Elle reste assise devant les quinze fichiers.',
          '— Ils sont bons.',
          '— Alors c’est bien ?',
          '— Oui. C’est justement le problème.',
        ],
      },
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'SOL',
        lignes: [
          '— On faisait des disques.',
          'Elle montre les quinze sonneries.',
          '— Maintenant on fabrique des choses',
          'que les gens oublient avant la prochaine sonnerie.',
          'Le rendez-vous du 14 juin reste au calendrier.',
        ],
      },
    ],
  },
  {
    id: 6,
    titre: 'FB-015',
    quand: 'Deux semaines avant',
    jours: JOURS[6],
    competence: 'creation',
    competenceLabel: 'CRÉATION',
    module: null,
    resume: 'Une référence libre dans le catalogue. La tienne.',
    etapes: [
      /* ⚠️ L'acte où le cahier des charges ne demande RIEN À PERSONNE — et c'est
       * le texte qui l'exige : « Aucun brief. Aucun client. Aucun style
       * imposé. […] Cette fois, personne ne te dit si c'est bon. »
       *
       * ⚠️ Il est pourtant devenu le PLUS LONG du jeu le 2026-09-01 (« l'acte 6,
       * le plus complet du jeu », Yann), et les deux tiennent ensemble parce
       * que « complet » ne veut pas dire « sévère » : ses onze lignes ne jugent
       * aucun goût, elles récapitulent les gestes des quatre actes précédents,
       * une section par acte. Rien jusqu'ici ne les demandait ensemble.
       *
       * ⚠️ Il exige trois lignes de SYNTHÉ, donc un module que l'acte 3 ouvre —
       * pas de `modulesRequis` ici : à l'acte 6 il l'est depuis longtemps, et
       * `scripts/parcours-carriere.cjs` le prouve en jouant (la commande est
       * acceptée avec « modules: atelier,synth,production »).
       *
       * C'est ce qui donne sa forme à toute la mécanique de commande : la
       * sévérité DÉCROÎT avec le récit. Les clients des actes 2 à 5 exigent des
       * choses précises parce qu'ils paient ; FB-015 n'exige que d'avoir été
       * fait. Son cahier ne demande donc pas si c'est réussi — il constate
       * qu'on s'est servi de ce qu'on a appris, et ses libellés sont écrits du
       * point de vue du joueur, pas d'un client.
       *
       * Une commande sans aucune ligne aurait été possible, et aurait été un
       * bouton qui ne juge rien — ce que le joueur sent au premier clic. */
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'LE TIROIR',
        lignes: [
          '— Maintenant qu’on a de l’argent, pourquoi tu vends ?',
          '— Parce que je ne veux pas passer dix ans de plus',
          'à fabriquer des sonneries.',
          'Puis elle ouvre le tiroir. Une cassette.',
          'Celle qu’elle t’a fait écouter en février,',
          'quand tu ne savais pas faire respirer une boucle.',
        ],
      },
      {
        kind: 'recit',
        source: 'cassette',
        entete: 'AMBRE — MAQUETTES',
        lignes: [
          'Ambre écrivait ses chansons.',
          'Sol devait produire son premier EP : pas l’écrire,',
          'trouver son son. Sol voulait que tout soit parfait.',
          'Elle a repoussé. Encore. Puis encore.',
          'Ambre est partie.',
        ],
      },
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'CE QUE TU ENTENDS CETTE FOIS',
        lignes: [
          'Il y a des fausses notes. Des silences. Des hésitations.',
          'Ce ne sont pas des morceaux. Ce sont des maquettes.',
          'Tu croyais que c’était un disque.',
          'C’était quelqu’un qui essayait.',
          'Et c’est exactement pour ça que ça respirait.',
        ],
      },
      {
        kind: 'recit',
        source: 'fax',
        entete: 'FICHE CARTONNÉE — FB-015',
        lignes: [
          '— Ce numéro devait être celui d’Ambre.',
          'Un silence.',
          '— Je voudrais qu’il soit le tien.',
          '— Je vends quand même. Mais je ne pars pas',
          'sans avoir sorti ce numéro.',
          'Aucun brief. Aucun client. Aucun style imposé.',
        ],
      },
      {
        kind: 'commande',
        entete: 'FB-015 — À TOI',
        lignes: [
          'Pour savoir ce que tu peux faire',
          'quand personne ne te dit quoi faire.',
          'Tu peux utiliser tout ce que tu as appris.',
          'Mais cette fois, personne ne te dira si c’est bon.',
        ],
        bouton: 'Ouvrir l’Atelier ▸',
        /* ⚠️ LE CAHIER LE PLUS COMPLET DU JEU — onze lignes, quand les autres
         * en comptent trois à six. Demande de Yann : *« l'acte 6, le plus complet
         * du jeu »*.
         *
         * ⚠️ Et « complet » ne veut PAS dire « sévère » : la phrase de l'acte
         * est « aucun brief, aucun client, aucun style imposé », et la règle
         * qui en découle — la sévérité DÉCROÎT avec le récit — ne bouge pas.
         * Ce cahier n'exige donc aucun genre, aucune ressemblance et aucun
         * jugement de goût : il RÉCAPITULE. Une section par acte traversé, un
         * geste par leçon, et des libellés écrits du point de vue du joueur
         * plutôt que d'un client qui paie.
         *
         * C'est aussi le seul endroit où l'on vérifie que les cinq mois ont
         * servi : les quatre actes précédents enseignent chacun deux ou trois
         * gestes, et rien jusqu'ici ne les demandait ENSEMBLE. */
        cahier: [
          AVOIR_PRODUIT,
          ...dansLaSection(FB_RYTHME, [
            lignesPresentes(['kick', 'snare', 'hat'], 'Les trois lignes de la grille'),
            auMoinsUneVariante('Un rim shot ou un charley ouvert — les deux gestes de Sol'),
            auMoinsUneRafale('Une rafale — ce qui casse la boucle avant qu’elle recommence'),
          ]),
          ...dansLaSection(FB_GROOVE, [
            swingAuMoins(8, 'Que ça ne soit pas carré — du balancement'),
            deLAlea('Que la machine ne joue pas deux fois pareil'),
          ]),
          ...dansLaSection(FB_COUCHES, [
            ligneSynthPresente('melody', 'Une mélodie — c’est elle qu’on fredonne'),
            ligneSynthPresente('bass', 'Une basse dessous, qui la porte'),
            ligneSynthPresente('pad', 'Et une nappe derrière — on ne l’écoute jamais, on la remarque quand elle part'),
          ]),
          ...dansLaSection(FB_PRODUCTION, [
            contrasteDeVolume(0.18, 'Des plans : tout n’est pas au même volume'),
            reverbDosee(0.15, 0.5, 'De l’espace — et pas une cathédrale'),
          ]),
        ],
        accepte: '— Je ne sais pas si c’est bon. […] C’est nouveau.',
        titre: 'FB-015',
        client: 'FACE B',
      },
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'LE CATALOGUE',
        lignes: [
          'Elle écoute sans rien dire pendant longtemps.',
          'Puis elle prend la fiche cartonnée et son stylo.',
          '— Il me faut un nom. Pour le catalogue.',
          'C’est la première fois en cinq mois',
          'qu’elle te demande comment tu t’appelles.',
          'Tu lui donnes celui que tu viens de choisir.',
        ],
      },
    ],
  },
  {
    id: 7,
    titre: 'LE 14 JUIN',
    quand: 'Le jour même',
    jours: JOURS[7],
    competence: 'scene',
    competenceLabel: 'SCÈNE',
    module: 'live',
    resume: 'La salle chante un jingle de lessive refusé par l’agence.',
    etapes: [
      /* ⚠️ L'acte cite les deux niveaux `jouer` (37 et 38) et rien d'autre, et
       * ce n'est pas un pis-aller : `justesseDesFrappes` retient la MEILLEURE
       * FENÊTRE CONSÉCUTIVE et non la moyenne du tour. Autrement dit, la
       * notation pardonne déjà un début raté et récompense la reprise — ce qui
       * est mot pour mot ce que Sol répond avant de brancher les enceintes :
       * « Tu te planteras. Mais maintenant tu sais quoi faire après. » La
       * mécanique portait la leçon de l'acte avant qu'il soit écrit.
       *
       * Aucune commande ici, contrairement aux actes 2 à 6 : on ne produit
       * plus, on joue. Et le Mode Live s'ouvre à la FIN — le récit décrit ce
       * qu'on y fera (lancer, enchaîner, rattraper), l'acte le donne en
       * sortant. Pas de commande non plus dans un module qu'on n'a pas encore
       * ouvert : c'est la même règle qu'à l'acte 1. */
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'DIX-HUIT HEURES',
        lignes: [
          'Le rendez-vous est à dix-huit heures.',
          'La sortie est à vingt et une.',
          'Sol a réservé l’arrière-salle de la laverie.',
          'Rachid coupe les machines.',
          'Il ne l’avait jamais fait pour personne.',
        ],
      },
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'TRENTE PERSONNES',
        lignes: [
          'Kelvin est venu avec quatre amis.',
          'Le Tunnel est représenté. Rachid aussi.',
          'Même le garçon du télé-crochet est là.',
          'Il a fini par trouver une chanson.',
          'Il n’a plus son book. Il a juste un CD.',
        ],
      },
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'AVANT DE COMMENCER',
        lignes: [
          '— Et si je me plante ?',
          '— Tu te planteras.',
          'Elle branche les enceintes.',
          '— Mais maintenant tu sais quoi faire après.',
        ],
      },
      {
        kind: 'exercice',
        niveau: 37,
        commande: 'Le premier morceau. Tu rates presque ton entrée. Kelvin te regarde.',
      },
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'TU REPRENDS',
        lignes: [
          'Personne n’a rien dit.',
          'Le morceau ne s’est pas arrêté pour t’attendre.',
          'C’est ça, la différence avec l’Atelier :',
          'ici on ne revient pas en arrière, on rattrape.',
        ],
      },
      {
        kind: 'exercice',
        niveau: 38,
        commande: 'Le deuxième passe. Le troisième aussi. Cette fois tu vois venir.',
      },
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'AU QUATRIÈME',
        lignes: [
          'Quelqu’un dans le public danse.',
          'Puis deux. Puis plusieurs.',
          'Tu termines.',
          'Silence.',
          'Puis les applaudissements.',
        ],
      },
      {
        kind: 'recit',
        source: 'cassette',
        entete: 'LE RAPPEL',
        lignes: [
          'Quelqu’un réclame le jingle de la laverie.',
          'Tout le monde le connaît.',
          'Trente personnes chantent douze secondes',
          'écrites pour vendre de la lessive,',
          'et refusées par l’agence qui les avait commandées.',
          'Plus grand succès populaire de Face B depuis 1996.',
          'Il ne rapportera jamais un centime.',
        ],
      },
      /* ⚠️ La réplique que tout le récit prépare, et le seul endroit du jeu où
       * un texte cite le joueur. Sol l'a appelé « le café » pendant cinq mois ;
       * à l'acte 6 elle lui demande enfin son nom, ici elle le dit à voix
       * haute. Le pseudo est tapé au tout premier écran, avant le prologue —
       * c'est ce qui rend la boucle complète. Voir `{pseudo}` dans la vue. */
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'ELLE PREND LE MICRO',
        lignes: [
          'Elle regarde la salle chanter. Longtemps.',
          'Puis elle sort et passe un appel de quarante secondes',
          'dans le couloir, sans que personne l’entende.',
          'Quand elle revient, elle monte près de toi.',
          'Pendant cinq mois, elle t’a appelé « le café ».',
          'Elle regarde le public.',
          '— Je vous présente… {pseudo}.',
          'C’est la première fois.',
        ],
      },
    ],
  },
];

export const NB_ACTES = ACTES.length;

/* L'ÉPILOGUE — septembre, et la boucle qui se referme.
 *
 * ⚠️ PAS un neuvième acte, et la distinction n'est pas cosmétique : il n'a ni
 * compétence, ni module, ni exercice, et il se passe des mois après le 14 juin.
 * L'ajouter à `ACTES` casserait `ActeId`, `JOURS`, le compte à rebours (quel
 * J−… pour « septembre » ?) et le carnet, pour ranger du texte dans une
 * structure qui décrit des épreuves.
 *
 * Il comble en revanche un vrai manque : jusqu'ici la carrière s'arrêtait sur
 * « LE MODE LIVE EST OUVERT » et plus rien. Le jeu n'avait pas de fin.
 *
 * Et sa dernière image est la première du jeu. Sol fait écouter deux sons à un
 * nouveau stagiaire et demande « lequel est le plus grave ? » — c'est mot pour
 * mot le niveau 49, le tout premier exercice de l'acte 0. Le joueur, lui, est
 * dans la pièce d'à côté, et il comprend ce qu'il entend. */
export const EPILOGUE: EtapeRecit[] = [
  {
    kind: 'recit',
    source: 'lcd',
    entete: 'SEPTEMBRE',
    lignes: [
      'Face B existe toujours. Pas comme avant.',
      'Sol n’a pas récupéré ses bureaux.',
      'Elle n’a pas signé quinze artistes.',
      'L’argent de Zik’Mobile a payé le pressage ;',
      'il n’en reste pas grand-chose.',
      'Mais FB-015 est sorti.',
    ],
  },
  {
    kind: 'recit',
    source: 'cassette',
    entete: 'FB-015 — CE QUE ÇA A FAIT',
    lignes: [
      'Quelques centaines d’exemplaires.',
      'Quelques téléchargements.',
      'Quelques concerts.',
      'Un début.',
    ],
  },
  /* ⚠️ La dernière image est la PREMIÈRE du jeu, et c'est la citation qui fait
   * la boucle — ne pas la réécrire sans réécrire l'acte 0 avec.
   *
   * Elle a changé le jour où l'acte 0 a changé : c'était « lequel est le plus
   * grave ? », la question du niveau 49, tant que l'acte 0 ouvrait sur un
   * `lequel`. Il ouvre maintenant sur « écoute ça, et tape avec » — la boucle
   * cite donc ce geste-là. Elle y gagne, en plus : un geste se voit de la
   * pièce voisine, une question à choix multiples non, et l'écran suivant
   * repose entièrement sur ce que le joueur ENTEND depuis l'autre pièce. */
  {
    kind: 'recit',
    source: 'lcd',
    entete: 'UN NOUVEAU STAGIAIRE',
    lignes: [
      'Il fait le café. Sol lui montre la machine.',
      '— Elle fuit quand tu remplis trop.',
      'Puis elle lance une boucle, quatre coups, rien d’autre.',
      '— Écoute ça, et tape avec.',
      'Il tape. Il est à côté. Sol relance la boucle.',
    ],
  },
  {
    kind: 'recit',
    source: 'lcd',
    entete: 'LA PIÈCE VOISINE',
    lignes: [
      'Tu es dans la pièce voisine.',
      'Tu entends les coups à travers la cloison.',
      'Tu t’arrêtes. Tu comptes avec lui. Tu souris.',
      'Sol regarde le nouveau.',
      '— Lundi, tu fais les sonneries.',
      '— Et sinon, je fais quoi ?',
      'Elle regarde le bureau. Puis toi.',
      '— On verra.',
    ],
  },
  {
    kind: 'recit',
    source: 'cassette',
    entete: 'SUR LE MUR',
    lignes: [
      'À côté du disque d’or de 1996,',
      'il y a maintenant une pochette',
      'imprimée sur une imprimante de bureau.',
      'FACE B — FB-015',
      'Et sous la pochette, une petite étiquette :',
      'NOUVELLE SORTIE',
    ],
  },
];

export const LONGUEUR_EPILOGUE = EPILOGUE.length;

/** L'acte qui ouvre chaque module — c'est le récit qui décide, pas un seuil.
 *  Dérivé de `ACTES` plutôt que réécrit : deux listes qui doivent rester
 *  d'accord finissent toujours par ne plus l'être. */
export const ACTE_DU_MODULE: Record<LockedModule, ActeId> = (() => {
  const out = {} as Record<LockedModule, ActeId>;
  for (const a of ACTES) if (a.module) out[a.module] = a.id;
  return out;
})();

export function acteParId(id: number): Acte {
  return ACTES[Math.max(0, Math.min(NB_ACTES - 1, Math.round(id)))];
}

/** Un acte sans étapes : le récit est écrit (`HISTOIRE.md`) mais ses exercices
 *  ne le sont pas encore. Affiché « à venir », jamais jouable — un acte qui
 *  s'ouvre sur du vide se lit comme une panne. */
export function acteAVenir(a: Acte): boolean {
  return a.etapes.length === 0;
}

/** Les niveaux du réservoir cités par un acte, dans l'ordre. */
export function niveauxDeLActe(a: Acte): number[] {
  return a.etapes.filter((e): e is EtapeExercice => e.kind === 'exercice').map((e) => e.niveau);
}

/* Les niveaux que le joueur a déjà RENCONTRÉS dans le récit.
 *
 * C'est ce que la salle de répétition propose — ni plus, ni moins :
 *
 *   - **ni plus** : « tout ce qui n'est pas encore accessible devrait être
 *     masqué : no spoil ». La carte montrait les 41 niveaux, dont ceux d'actes
 *     pas encore écrits ;
 *   - **ni moins** : « dans la salle de répétition, il faut pouvoir refaire les
 *     niveaux ». L'ancienne carte les ouvrait sur `id <= PlayerProgress.level`,
 *     un seuil hérité de la campagne linéaire. Or la carrière cite les niveaux
 *     39-41 AVANT le niveau 1 : après tout l'acte 0, la carte affichait 40
 *     niveaux verrouillés sur 41 — y compris les trois qu'on venait de jouer.
 *     Et un exercice abandonné n'avançait pas `level` du tout, donc ne
 *     s'ouvrait jamais.
 *
 * Rencontré, pas réussi : on peut refaire ce qu'on a raté. Les étoiles, elles,
 * restent la mesure de la réussite.
 *
 * `etape` est le curseur DANS l'acte courant : les actes précédents comptent en
 * entier, l'acte en cours ne compte que ce qui est derrière le curseur.
 */
export function niveauxRencontres(acte: number, etape: number): number[] {
  const out: number[] = [];
  for (const a of ACTES) {
    if (a.id > acte) break;
    const jusqua = a.id < acte ? a.etapes.length : etape;
    for (let i = 0; i < Math.min(jusqua, a.etapes.length); i++) {
      const e = a.etapes[i];
      if (e.kind === 'exercice' && !out.includes(e.niveau)) out.push(e.niveau);
    }
  }
  return out;
}

/* Pourquoi il n'y a PAS de migration depuis `level`.
 *
 * La tentation était d'y placer un vétéran à l'acte qui correspond à ses
 * niveaux. Elle ne marche pas, et le premier essai l'a montré : l'acte 0 cite
 * les niveaux 39-41 (les trois verbes de paramètre), qui sont des BONUS posés
 * après la campagne d'origine. Un joueur qui avait tout fini au niveau 34 ne
 * les a jamais joués — aucune règle de dérivation ne peut donc le déclarer
 * « acte 0 acquis » sans mentir sur ce qu'il a entendu.
 *
 * Le Mode carrière est du contenu NEUF : tout le monde le commence au début,
 * y compris ceux qui connaissent déjà les niveaux qu'il cite. Ce qui compte,
 * c'est que personne ne perde d'accès en chemin — et c'est le rôle du OU dans
 * `moduleUnlocked` : les seuils de niveau restent un plancher, donc un vétéran
 * garde son Atelier, son Synthé et sa Production pendant qu'il fait le café.
 */

/* Invariants vérifiés au chargement du module — autant qu'il refuse de se
 * charger plutôt que de mentir (même parti pris que le seuil impossible de
 * `unlocks.ts`). Un niveau cité qui n'existe pas donnerait un acte injouable
 * découvert par le joueur, pas par nous. */
const IDS = new Set(LEVELS.map((l) => l.id));
for (const a of ACTES) {
  for (const n of niveauxDeLActe(a)) {
    if (!IDS.has(n)) throw new Error(`Acte ${a.id} « ${a.titre} » cite un niveau inexistant : ${n}`);
  }
}
