/* Le Mode carrière — la charpente en huit actes du récit de `HISTOIRE.md`.
 *
 * Pourquoi ce fichier existe
 * --------------------------
 * `PlayerProgress.level` était UN SEUL entier qui portait trois choses sans
 * rapport : ce que le joueur sait, ce qui lui est ouvert, et pourquoi il
 * continue (PLAN.md, « Architecture du Mode jeu »). Tant qu'il n'y avait qu'un
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
  lignes: string[];
  /** Le libellé du bouton qui emmène dans l'Atelier. */
  bouton: string;
}

export type Etape = EtapeRecit | EtapeExercice | EtapeLivraison;

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
      '— Écoute la hauteur, la durée, l’intensité.',
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
      /* ⚠️ Les quatre mots de `HISTOIRE.md` — « la hauteur ; la durée ;
       * l'intensité ; le silence » — et rien d'autre.
       *
       * L'acte utilisait `nommer` et `regler`, deux verbes de VOCABULAIRE, dans
       * un acte où l'Atelier est FERMÉ : on demandait de nommer des curseurs
       * jamais vus (« je ne sais même pas expliquer ce que c'est decay »).
       * Ils déménagent à l'acte 2, où les mots sont enfin sur des boutons que
       * le joueur a rencontrés. Ici il ne reste que `lequel`, qui parle en
       * propriétés, et le verbe du silence. */
      {
        kind: 'exercice',
        niveau: 49,
        commande: '— Tu fais quoi exactement ici ? — Le café. — Je sais. Écoute ça.',
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
      // ⚠️ Aucune de ces commandes ne nomme le SENS de la question : `paramSens`
      // est tiré à chaque partie. « Lequel dure le plus ? » mentait une fois
      // sur deux, sur l'écran d'à côté qui demandait le plus court.
      { kind: 'exercice', niveau: 50, commande: 'Elle recommence. — Même exercice. Là, c’est la durée qui change.' },
      { kind: 'exercice', niveau: 51, commande: 'Encore. — Et celui-là, il est plus fort ou plus doux ?' },
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
      { kind: 'exercice', niveau: 2, commande: 'La première sonnerie. Le kick tient le temps, la snare répond.' },
      { kind: 'exercice', niveau: 3, commande: 'La deuxième. Le hi-hat par-dessus, et le trio est complet.' },
      { kind: 'exercice', niveau: 7, commande: 'La troisième. Plus de cases, donc plus de précision.' },
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
      { kind: 'exercice', niveau: 5, commande: 'Une seule case porte une variante — rim shot, ou charley ouvert. Trouve-la.' },
      { kind: 'exercice', niveau: 8, commande: 'Et une seule part en rafale. C’est elle qui donne l’urgence.' },
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
      /* ⚠️ L'acte citait cinq GRILLES à reproduire (presets, swing, traîne,
       * ghost notes, décalage). Retour de Yann : « pour le groove, on ne
       * comprend pas pourquoi il y a les rafales et les charleys ouverts, rim
       * shot, personne n'explique, ce n'est pas lié au groove. Le groove, ce
       * sont des paramètres qu'on doit pouvoir régler. »
       *
       * Il ne cite donc plus que les trois verbes de PARAMÈTRE sur la famille
       * `groove` : entendre (`lequel`), nommer (`nommer`), viser (`regler`).
       * C'est aussi le premier endroit où `nommer` et `regler` ont un sens :
       * l'Atelier est ouvert depuis l'acte 1, les mots « Swing » et
       * « Décalage » sont enfin sur des curseurs que le joueur a vus. À l'acte
       * 0 ils ne renvoyaient à rien — « je ne sais même pas expliquer ce que
       * c'est decay ».
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
      {
        kind: 'exercice',
        niveau: 45,
        commande: 'Sol, sans lever les yeux : — Il a raison. Écoute : même rythme, pas le même balancement.',
      },
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'SOL',
        lignes: [
          '— Ça s’appelle le swing.',
          'Un temps sur deux arrive un peu en retard.',
          'Toujours le même, toujours du même retard.',
          '— Et c’est réglable ?',
          '— Tout est réglable. C’est bien le problème.',
        ],
      },
      {
        kind: 'exercice',
        niveau: 46,
        commande: 'Autre bouton : là, c’est la ligne entière qui glisse. Le kick, lui, ne bouge pas.',
      },
      {
        kind: 'exercice',
        niveau: 47,
        commande: 'Kelvin en a repéré deux. Il ne sait pas les nommer. Toi, si.',
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
        ],
      },
      {
        kind: 'exercice',
        niveau: 48,
        commande: 'Alors trouve-le au curseur. Pas le chiffre : le balancement.',
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
        commande: 'Tu commences par la basse. Les hauteurs, une par une.',
      },
      {
        kind: 'exercice',
        niveau: 43,
        commande: 'Puis le motif — ce qui fait qu’une phrase revient.',
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
        commande: 'La deuxième, celle qu’il réclame. Toute la gamme, cette fois.',
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
          'La deuxième version tourne quatre jours.',
          'Trois clientes se plaignent.',
          'Il remet la première et n’en reparle plus.',
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
      /* ⚠️ L'acte tient sur UNE phrase de `HISTOIRE.md` — « Ton morceau est bon
       * dans ton ordinateur. Ici, il est mauvais. » — et elle ne peut pas être
       * racontée : il faut l'entendre. D'où le petit haut-parleur, qui est un
       * étage de moteur (`graph.ts`) et non un texte, et le verbe `laverie` qui
       * s'en sert. Il ouvre l'acte : les trois exercices de mixage qui suivent
       * n'ont de raison d'être que parce qu'on a entendu le problème.
       *
       * L'EQ et la compression, que le texte cite aussi, ne sont PAS ici :
       * elles sont globales dans le format v2, donc sans version par ligne à
       * faire entendre. Citées à moitié, elles auraient produit exactement le
       * défaut de l'acte 0 — un mot sans bouton derrière. */
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
          '— Écoute ça là-dedans.',
        ],
      },
      {
        kind: 'exercice',
        niveau: 53,
        commande: 'Tout le grave a disparu. — Laquelle tient encore ?',
      },
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'SOL',
        lignes: [
          '— Tu vois ?',
          '— Non.',
          '— Ton morceau est bon dans ton ordinateur.',
          'Elle tapote le petit boîtier.',
          '— Ici, il est mauvais. Et c’est ici qu’on l’écoute.',
          '— Je fais quoi ?',
          '— Tu enlèves. Ensuite seulement, tu ajoutes.',
        ],
      },
      { kind: 'exercice', niveau: 54, commande: 'On commence par enlever. Le filtre, c’est le geste qui enlève.' },
      { kind: 'exercice', niveau: 55, commande: 'Puis l’espace. Ce qui met un son au fond de la pièce.' },
      { kind: 'exercice', niveau: 56, commande: 'Deux façons d’en faire, et personne ne les distingue. Toi si.' },
      { kind: 'exercice', niveau: 57, commande: 'La même distance que la cible. Pas le même chiffre.' },
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
       * Les reconstructions, elles, existent déjà dans le réservoir depuis la
       * campagne d'origine : l'acte les CITE (4, 12, 13, 27, 32 — Motown,
       * House, Dancehall, Dembow, Funk), une par catégorie du fax. Un acte
       * cite, il ne fabrique jamais. */
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
        commande: 'Elle sort un carnet. Trente-quatre disques, un par genre. — Écoute.',
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
      { kind: 'exercice', niveau: 4, commande: 'Sol vérifie les classiques. Motown, pour commencer.' },
      { kind: 'exercice', niveau: 12, commande: 'Le Tunnel vérifie les morceaux de club. Gratuitement, et sans ménagement.' },
      { kind: 'exercice', niveau: 13, commande: 'Le dancehall du commercial. Celui qu’il ne savait pas nommer.' },
      { kind: 'exercice', niveau: 27, commande: 'Ambiance latino, dit le fax. Dembow, dit le carnet.' },
      { kind: 'exercice', niveau: 32, commande: 'Kelvin vérifie le hip-hop. Il commence par le funk d’où il vient.' },
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
    etapes: [],
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
    etapes: [],
  },
];

export const NB_ACTES = ACTES.length;

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
