/* L'ARCHITECTURE D'UN MORCEAU — la chaîne de sections du Mode Live.
 *
 * Une architecture est une liste de SECTIONS jouées dans l'ordre ; chaque
 * section dit QUELLE LETTRE jouer (A, B, C, D), combien de tours, et quelles
 * lignes sonnent. L'étude qui a cadré tout ça est dans
 * docs/plan/06-audit-architectures-de-morceau.md ; ce que la relecture de Yann
 * du 2026-09-07 y a changé est dans model/parties.ts.
 *
 * ⚠️ UNE SECTION CITE UNE LETTRE, JAMAIS « RIEN ». `sequenceId: string | null`
 * autorisait une section sans motif — elle gardait alors le motif courant,
 * c'est-à-dire n'importe lequel, et une chaîne fraîchement chargée jouait huit
 * fois la même chose. C'était l'état PAR DÉFAUT de la fonctionnalité, et c'est
 * ce que « pas du tout audible » désignait. `partie` est donc obligatoire : une
 * chaîne dit toujours ce qu'elle joue, et le pire cas (la lettre est encore
 * vide) est visible sur la case au lieu d'être silencieux.
 *
 * ⚠️ LE PRIME EST LE CALQUE, il n'a pas de champ à lui. A′ est « A avec des
 * lignes en moins » — c'est exactement `lignes`, et c'est ce qui fait tenir les
 * deux formes que Yann décrit avec un seul mécanisme : l'intro qui entre
 * progressivement, le pont, l'outro qui s'efface sont des calques sur A ou B,
 * pas des motifs de plus à composer.
 *
 * ⚠️ UN CYCLE N'EST PAS UNE MESURE, ET C'EST LE PIÈGE PRINCIPAL. Une ligne de
 * batterie boucle en une mesure pile, mais une ligne de synthé s'étale sur
 * `cycleBars` mesures (1 à 16) — et la nappe en fait QUATRE dans 30 presets
 * sur 34. « 8 cycles de A » vaut donc 8 ou 32 mesures selon la lecture, un
 * facteur quatre. On compte en TOURS DU MOTIF, calculés (voir cycleDuMotif),
 * jamais supposés : c'est ce qui rend une coupure de phrase impossible par
 * construction.
 */
import type { PatternStateV2, LineName, DrumRowName, SynthRowName } from './types';
import { DRUM_ROW_NAMES, SYNTH_ROW_NAMES } from './types';
import { PARTIES, type PartieId } from './parties';

export interface Section {
  id: string;
  /** Ce qui s'affiche en gros pendant le set : « REFRAIN », « MONTÉE ». */
  nom: string;
  /** La LETTRE que cette section joue. Jamais absente — voir l'en-tête. */
  partie: PartieId;
  /** Nombre de tours du cycle propre du motif. Jamais un nombre de mesures. */
  cycles: number;
  /**
   * Les lignes qui sonnent dans cette section, ou `null` pour « toutes ».
   * C'est un CALQUE posé sur le motif, jamais une copie — et c'est lui qui
   * écrit le PRIME : une section dont `lignes` n'est pas nul s'affiche « A′ ».
   */
  lignes: LineName[] | null;
}

export interface Architecture {
  nom: string;
  sections: Section[];
}

/** « A » ou « A′ » — le prime se lit sur le calque, il n'est pas stocké. */
export function libelleDePartie(s: Section): string {
  return s.lignes === null ? s.partie : `${s.partie}′`;
}

/** Plus petit commun multiple — la seule arithmétique de ce fichier. */
function ppcm(a: number, b: number): number {
  const pgcd = (x: number, y: number): number => (y === 0 ? x : pgcd(y, x % y));
  return Math.abs(a * b) / (pgcd(a, b) || 1);
}

function ligneSonne(state: PatternStateV2, name: LineName): boolean {
  if ((DRUM_ROW_NAMES as string[]).includes(name)) {
    const row = state.rows[name as DrumRowName];
    if (row.muted) return false;
    return row.pattern.slice(0, row.subdiv).some((v) => v > 0);
  }
  const row = state.synthRows[name as SynthRowName];
  if (row.muted) return false;
  return row.pattern
    .slice(0, row.subdivisions)
    .some((v) => (name === 'pad' ? typeof v === 'number' && v >= 0 : v != null));
}

/**
 * Le CYCLE PROPRE d'un motif, en mesures : le plus petit commun multiple des
 * longueurs de ses lignes qui sonnent.
 *
 * Une ligne de batterie vaut 1 (elle boucle en une mesure quelle que soit sa
 * subdivision) ; une ligne de synthé vaut son `cycleBars`.
 *
 * ⚠️ Les lignes MUETTES ou VIDES ne comptent pas. Sans ça, un motif dont la
 * nappe est coupée mais laissée à `cycleBars: 16` imposerait des sections de
 * seize mesures pour rien.
 */
export function cycleDuMotif(state: PatternStateV2): number {
  let cycle = 1;
  for (const name of SYNTH_ROW_NAMES) {
    if (!ligneSonne(state, name)) continue;
    cycle = ppcm(cycle, Math.max(1, Math.round(state.synthRows[name].cycleBars)));
  }
  return Math.max(1, cycle);
}

/** Combien de MESURES dure une section, sur un motif de ce cycle. */
export function mesuresDeSection(section: Section, cycle: number): number {
  return Math.max(1, Math.round(section.cycles)) * Math.max(1, Math.round(cycle));
}

/**
 * La durée totale d'une architecture, en secondes, au tempo donné.
 *
 * ⚠️ `cycleDe` REND LE CYCLE DE CHAQUE LETTRE, il n'y a pas un cycle unique.
 * Le cycle propre est une propriété du MOTIF : une partie dont la nappe s'étale
 * sur quatre mesures a un cycle de 4, une autre en batterie seule a un cycle
 * de 1. Compter toute la chaîne avec le cycle du motif COURANT — ce que faisait
 * la première version — donne, pour la MÊME chaîne, « 1 min 44 » ou « 26 s »
 * selon la partie chargée au moment où on regarde, alors que la vraie durée
 * vaut 1 min 02. Mesuré, pas déduit.
 */
export function dureeSecondes(
  sections: Section[],
  cycleDe: (partie: PartieId) => number,
  tempo: number,
): number {
  const mesure = 240 / Math.max(1, tempo);
  return sections.reduce((t, s) => t + mesuresDeSection(s, cycleDe(s.partie)) * mesure, 0);
}

/** Le nombre total de MESURES d'une chaîne — même règle que ci-dessus. */
export function mesuresTotales(sections: Section[], cycleDe: (partie: PartieId) => number): number {
  return sections.reduce((t, s) => t + mesuresDeSection(s, cycleDe(s.partie)), 0);
}

/** « 1 min 44 » — la seule information que l'utilisateur lit vraiment. */
export function formaterDuree(secondes: number): string {
  const s = Math.round(secondes);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m} min ${String(s % 60).padStart(2, '0')}` : `${s} s`;
}

/* ---- LES CALQUES NOMMÉS ----
 *
 * Trois gestes, et ce sont ceux que Yann décrit mot pour mot : « un A qui
 * entre progressivement », « A′ ou B′ : pont », « B qui s'efface ». Les nommer
 * ici plutôt que de recopier des tableaux dans chaque montage garantit qu'une
 * intro est la même intro d'un montage à l'autre — et qu'on lit ce qu'elle
 * fait au lieu de compter des lignes.
 */
/** L'entrée : le squelette seul. */
export const CALQUE_ENTREE: LineName[] = ['kick', 'hat'];
/** Le pont : on retire ce qui bat le temps, on garde ce qui chante. */
export const CALQUE_PONT: LineName[] = ['kick', 'bass', 'pad', 'melody'];
/** La sortie : la batterie s'efface, l'harmonie reste. */
export const CALQUE_SORTIE: LineName[] = ['hat', 'pad', 'melody'];
/** La montée : le squelette plus ce qui pousse. */
export const CALQUE_MONTEE: LineName[] = ['kick', 'hat', 'snare', 'bass'];
/** Le break de club : plus rien ne frappe. */
export const CALQUE_BREAK: LineName[] = ['pad', 'melody'];

let compteur = 0;
function sec(nom: string, partie: PartieId, cycles: number, lignes: LineName[] | null = null): Section {
  return { id: `sec-${++compteur}`, nom, partie, cycles, lignes };
}

/* ---- LES MONTAGES ----
 *
 * ⚠️ UN MONTAGE N'EST PAS QU'UNE CHAÎNE. Yann : « qu'il y ait des presets
 * d'architecture / affectation de bouton / lignes mutées qui permettent de
 * pouvoir assembler un morceau très facilement ». Les trois vont ensemble et
 * c'est le point : une chaîne de sections sans les boutons qui la pilotent
 * (SUIVANT, TENIR) se joue contre le musicien, et les lignes mutées SONT les
 * calques des sections. Un montage porte donc les trois d'un coup.
 *
 * Les deux premiers sont les deux exemples de Yann, écrits tels quels.
 * `boutons` cite des identifiants du catalogue `ui/live/liveActions` : le
 * modèle ne connaît pas l'UI, c'est elle qui valide (et ignore ce qu'elle ne
 * reconnaît pas, plutôt que de refuser le montage en bloc — même leçon que la
 * migration des assignations).
 */
export interface Montage {
  nom: string;
  /** Une ligne, lue sur le bouton qui le charge. */
  desc: string;
  sections: Section[];
  /** Les six boutons du Mode Live, ou `null` pour ne pas y toucher. */
  boutons: string[][] | null;
}

const BOUTONS_CHAINE: string[][] = [
  ['section-next'],
  ['section-hold'],
  ['ligne-kick'],
  ['ligne-snare'],
  ['break'],
  ['fill'],
];

const BOUTONS_CLUB: string[][] = [
  ['section-next'],
  ['mute-drums'],
  ['ligne-kick'],
  ['ligne-hat'],
  ['break'],
  ['chaos'],
];

export const MONTAGES: Montage[] = [
  {
    nom: 'BOUCLE',
    desc: 'A en boucle — les mains font tout',
    sections: [sec('BOUCLE', 'A', 4)],
    boutons: null,
  },
  {
    /* L'exemple 1 de Yann, ligne pour ligne :
       « un A qui entre progressivement : Intro / A : couplet / B : refrain /
         A : couplet / B : refrain / A′ ou B′ : pont / B qui s'efface : outro » */
    nom: 'COUPLET / REFRAIN',
    desc: 'Intro · A B A B · pont · B · outro',
    sections: [
      sec('INTRO', 'A', 1, CALQUE_ENTREE),
      sec('COUPLET', 'A', 2),
      sec('REFRAIN', 'B', 2),
      sec('COUPLET', 'A', 2),
      sec('REFRAIN', 'B', 2),
      sec('PONT', 'A', 1, CALQUE_PONT),
      sec('REFRAIN', 'B', 2),
      sec('OUTRO', 'B', 1, CALQUE_SORTIE),
    ],
    boutons: BOUTONS_CHAINE,
  },
  {
    /* L'exemple 2 : « ABB′ABB′A′ outro ». */
    nom: 'A B B′',
    desc: 'A B B′ · A B B′ · A′ · outro',
    sections: [
      sec('A', 'A', 2),
      sec('B', 'B', 2),
      sec('B PRIME', 'B', 2, CALQUE_PONT),
      sec('A', 'A', 2),
      sec('B', 'B', 2),
      sec('B PRIME', 'B', 2, CALQUE_PONT),
      sec('A PRIME', 'A', 1, CALQUE_PONT),
      sec('OUTRO', 'A', 1, CALQUE_SORTIE),
    ],
    boutons: BOUTONS_CHAINE,
  },
  {
    /* ⚠️ La forme de 32 mesures — la plus documentée qui soit, et la seule où
       UNE SEULE section contraste. Sur un cycle de 4, « ×2 » vaut 8 mesures :
       ce modèle tombe donc EXACTEMENT sur A(8) A(8) B(8) A(8), la forme
       historique. Ce n'est pas un réglage, c'est une conséquence du choix de
       compter en tours (audit 06 §4). */
    nom: 'AABA',
    desc: 'La forme de 32 mesures — seul le B contraste',
    sections: [
      sec('A', 'A', 2),
      sec('A', 'A', 2),
      sec('B', 'B', 2),
      sec('A', 'A', 2),
    ],
    boutons: BOUTONS_CHAINE,
  },
  {
    /* Arbitré par Yann : le seul modèle qui demande TROIS motifs, et donc la
       seule raison d'être de la lettre C. Forme classique. */
    nom: 'RONDO',
    desc: 'A B A C A — le refrain revient entre deux contrastes',
    sections: [
      sec('A', 'A', 2),
      sec('B', 'B', 2),
      sec('A', 'A', 2),
      sec('C', 'C', 2),
      sec('A', 'A', 2),
    ],
    boutons: BOUTONS_CHAINE,
  },
  {
    /* Arbitré par Yann (« ajouter également un abc ab′c′ ») : trois matières,
       puis la même suite ALLÉGÉE. C'est la forme où le second passage ne
       change pas de motifs mais de densité — les calques font le contraste,
       les lettres font la matière. */
    nom: 'A B C · A B′ C′',
    desc: 'Trois matières, puis les mêmes en retrait',
    sections: [
      sec('A', 'A', 2),
      sec('B', 'B', 2),
      sec('C', 'C', 2),
      sec('A', 'A', 2),
      sec('B PRIME', 'B', 2, CALQUE_PONT),
      sec('C PRIME', 'C', 1, CALQUE_SORTIE),
    ],
    boutons: BOUTONS_CHAINE,
  },
  {
    /* L'arc d'INTENSITÉ — une seule lettre, ce sont les LIGNES qui entrent et
       sortent. C'est ce que le calque sert à faire, et c'est pour ça qu'il
       n'est pas décoratif : ce montage ne demande QU'UNE partie remplie.
       Longueurs conformes à la convention (intro 16, montée 16, drop 32
       mesures sur un cycle de 4) — voir docs/plan/08 §2. */
    nom: 'CLUB',
    desc: 'Une seule partie — intro, montée, climax, break',
    sections: [
      sec('INTRO', 'A', 2, CALQUE_ENTREE),
      sec('MONTÉE', 'A', 2, CALQUE_MONTEE),
      sec('CLIMAX', 'A', 4),
      sec('BREAK', 'A', 1, CALQUE_BREAK),
      sec('CLIMAX', 'A', 4),
      sec('SORTIE', 'A', 2, CALQUE_SORTIE),
    ],
    boutons: BOUTONS_CLUB,
  },
];

/** Une copie fraîche d'un montage — les sections sont mutables côté store. */
export function montageFrais(nom: string): Architecture | null {
  const m = MONTAGES.find((x) => x.nom === nom);
  if (!m) return null;
  return {
    nom: m.nom,
    sections: m.sections.map((s) => ({
      ...s,
      id: `sec-${++compteur}`,
      lignes: s.lignes ? [...s.lignes] : null,
    })),
  };
}

export function montageParNom(nom: string): Montage | null {
  return MONTAGES.find((m) => m.nom === nom) ?? null;
}

/* ---- LA MIGRATION DE L'ANCIENNE FORME ----
 *
 * ⚠️ ELLE VIT ICI, PURE, PARCE QU'ELLE DOIT ÊTRE TESTÉE. Une migration se joue
 * sur la sauvegarde de QUELQU'UN D'AUTRE : on ne la voit rater qu'en
 * production, et la leçon a déjà été payée une fois (`liveActions.ts`, où une
 * validation tout-ou-rien rendait les défauts — six boutons et trois snapshots
 * perdus, sans un mot).
 *
 * L'ancienne forme citait un `sequenceId` d'entrée de banque ; la nouvelle cite
 * une LETTRE. On traduit : les séquences citées deviennent A, B, C, D dans leur
 * ordre d'apparition. Une section qui ne citait RIEN gardait le motif courant,
 * c'est-à-dire n'importe lequel : elle devient A, le seul choix qui rende la
 * chaîne audible.
 *
 * La fonction ne touche à rien — elle REND la correspondance, et c'est
 * l'appelant (le store) qui va chercher les motifs dans la banque. C'est ce qui
 * la rend testable sans navigateur ni `localStorage`.
 */
export interface MigrationArchitecture {
  architecture: Architecture;
  /** `[identifiant de banque, lettre]`, dans l'ordre d'apparition. */
  lettres: Array<[string, PartieId]>;
}

export function migrerArchitecture(v: unknown): MigrationArchitecture | null {
  if (!v || typeof v !== 'object') return null;
  const a = v as { nom?: unknown; sections?: unknown };
  if (!Array.isArray(a.sections)) return null;
  const anciennes = a.sections as Array<Record<string, unknown>>;
  if (!anciennes.some((s) => s && typeof s === 'object' && 'sequenceId' in s)) return null;

  const lettreDe = new Map<string, PartieId>();
  for (const s of anciennes) {
    const id = s?.sequenceId;
    if (typeof id !== 'string' || lettreDe.has(id)) continue;
    // Au-delà de quatre séquences citées, les suivantes retombent sur A : mieux
    // vaut une chaîne qui joue A que des cases muettes.
    if (lettreDe.size >= PARTIES.length) break;
    lettreDe.set(id, PARTIES[lettreDe.size]);
  }
  return {
    architecture: {
      nom: typeof a.nom === 'string' ? a.nom : 'MORCEAU',
      sections: anciennes.map((s, i) => ({
        id: typeof s?.id === 'string' ? s.id : `sec-migre-${i}`,
        nom: typeof s?.nom === 'string' ? s.nom : 'SECTION',
        partie: (typeof s?.sequenceId === 'string' ? lettreDe.get(s.sequenceId) : undefined) ?? 'A',
        cycles: typeof s?.cycles === 'number' && s.cycles > 0 ? Math.round(s.cycles) : 1,
        lignes: Array.isArray(s?.lignes) ? (s.lignes as Section['lignes']) : null,
      })),
    },
    lettres: [...lettreDe.entries()],
  };
}
