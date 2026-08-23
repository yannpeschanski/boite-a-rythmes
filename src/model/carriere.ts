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

export type Etape = EtapeRecit | EtapeExercice;

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
      {
        kind: 'recit',
        source: 'repondeur',
        entete: 'MESSAGE — 11 s',
        lignes: [
          'Le sous-traitant qui fabrique les sonneries arrête.',
          'Il a trouvé mieux.',
          'Il laisse un dossier et un mot de passe.',
          'Le mot de passe ne marche pas.',
          'Sol essaie trois fois. Il ne répond plus.',
        ],
      },
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'SOL',
        lignes: [
          '— Il va falloir tout refaire.',
          '— Tu fais quoi exactement ici ?',
          '— Le café.',
          '— Je sais.',
          'Elle te fait écouter deux sons.',
        ],
      },
      // ⚠️ Ces trois commandes ne nomment PAS le réglage : les niveaux 39-41
      // tirent le leur au hasard dans la famille Timbre. « Lequel est le plus
      // grave ? » — la phrase du texte — mentait une fois sur quatre à l'écran.
      // Une commande ne doit promettre que ce que le tirage tient.
      { kind: 'exercice', niveau: 39, commande: 'Elle te fait écouter deux sons. — Alors ?' },
      { kind: 'exercice', niveau: 40, commande: 'Elle en fait écouter deux autres. — Et là, qu’est-ce qui change ?' },
      { kind: 'exercice', niveau: 41, commande: 'Puis un dernier. — Refais-le-moi à l’identique.' },
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'SOL',
        lignes: [
          'Elle te regarde comme si la plante verte venait de parler.',
          '— Lundi tu fais les sonneries.',
          'Tu apprends à reconnaître la hauteur, la durée,',
          'l’intensité, et le silence.',
        ],
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
          '— Voilà. Tu es officiellement dans l’industrie musicale.',
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
      {
        kind: 'recit',
        source: 'fax',
        entete: 'BRIEF — CLIENT',
        lignes: [
          'QUELQUE CHOSE QUI FAIT SÉRIEUX',
          'MAIS QUI DONNE ENVIE DE BOUGER.',
          '— Ça veut dire quoi ?',
          '— Ça veut dire qu’ils ne savent pas.',
          'Tu dois te débrouiller.',
        ],
      },
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'SOL T’APPREND LA GRILLE',
        lignes: ['Kick.', 'Snare.', 'Hi-hat.', 'Subdivisions.'],
      },
      { kind: 'exercice', niveau: 1, commande: 'La première sonnerie. Une seule ligne, pour commencer.' },
      { kind: 'exercice', niveau: 2, commande: 'La deuxième. La snare entre.' },
      { kind: 'exercice', niveau: 3, commande: 'La troisième. Le trio complet.' },
      { kind: 'exercice', niveau: 7, commande: 'La quatrième. Plus de cases, plus de précision.' },
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'RELEVÉ DU MOIS',
        lignes: [
          'La quatrième prend.',
          'QUATRE-VINGT-ONZE EUROS.',
          '— On était meilleurs quand on vendait des albums.',
          '— Vous avez arrêté pourquoi ?',
          '— Nous, on n’a pas arrêté. Les gens ont arrêté d’acheter.',
          'Le soir, tu restes seul pour travailler.',
        ],
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
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'LE MARDI',
        lignes: [
          'Kelvin a seize ans. Il fait du rap.',
          'Il n’a jamais rien sorti.',
          'Il cherche des instrumentaux.',
          'Il ne montre jamais ses textes.',
          'Il te demande une boucle.',
        ],
      },
      { kind: 'exercice', niveau: 4, commande: 'Quelque chose de parfaitement calé. Propre, carré, comme à la radio.' },
      {
        kind: 'recit',
        source: 'lcd',
        entete: 'KELVIN',
        lignes: [
          '— C’est nul.',
          '— Pourquoi ?',
          '— Ça fait réveil.',
          'Il tape du doigt sur la table.',
          '— C’est carré, mais personne ne danse carré.',
          'Sol, depuis son bureau : — Il a raison.',
        ],
      },
      { kind: 'exercice', niveau: 14, commande: 'Le swing : les temps faibles reculent un peu.' },
      { kind: 'exercice', niveau: 15, commande: 'La traîne : ça arrive juste après, exprès.' },
      { kind: 'exercice', niveau: 20, commande: 'Les ghost notes : ce qu’on entend à peine tient tout.' },
      { kind: 'exercice', niveau: 23, commande: 'Le décalage : une ligne entière en avant, ou en retard.' },
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
    etapes: [],
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
    etapes: [],
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
    etapes: [],
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
