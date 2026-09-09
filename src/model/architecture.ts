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

/** Le nom français de chaque ligne — partagé par tout ce qui EXPLIQUE un montage. */
export const LIGNE_LIBELLE: Record<LineName, string> = {
  kick: 'kick',
  snare: 'caisse',
  hat: 'charley',
  clap: 'clap',
  shaker: 'shaker',
  bass: 'basse',
  pad: 'nappe',
  melody: 'mélodie',
};

/**
 * Ce qu'un calque fait entendre, en toutes lettres.
 *
 * ⚠️ Il DIT CE QUI SONNE, pas ce qui est coupé. Une fiche de style décrit ce
 * qu'il FAUT entendre, jamais l'absence d'un instrument — même raison ici : « A
 * moins la caisse, moins la basse, moins la nappe » se compte, « kick et
 * charley » s'entend.
 */
export function libelleCalque(lignes: LineName[] | null): string {
  if (lignes === null) return 'toutes les lignes';
  if (lignes.length === 0) return 'rien';
  return lignes.map((l) => LIGNE_LIBELLE[l]).join(' · ');
}

/** Ce qu'une section fait, en une phrase — « COUPLET · A · 2 tours · 8 mesures ». */
export function resumeDeSection(s: Section, cycle: number): string {
  const m = mesuresDeSection(s, cycle);
  return `${s.nom} · ${libelleDePartie(s)} · ${s.cycles} tour${s.cycles > 1 ? 's' : ''} · ${m} mesure${m > 1 ? 's' : ''}`;
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
/** Le squelette : le beat nu, rien pour l'habiller. */
export const CALQUE_SQUELETTE: LineName[] = ['kick', 'snare'];
/** Le décollage : tout le haut, plus une frappe. */
export const CALQUE_SANS_BATTERIE: LineName[] = ['bass', 'pad', 'melody'];
/** Dépouillé : les deux graves, et c'est tout — le couplet qui rentre. */
export const CALQUE_DEPOUILLE: LineName[] = ['kick', 'bass'];

let compteur = 0;
function sec(nom: string, partie: PartieId, cycles: number, lignes: LineName[] | null = null): Section {
  return { id: `sec-${++compteur}`, nom, partie, cycles, lignes };
}

/* ---- LES MONTAGES ----
 *
 * ⚠️ UN MONTAGE EST UN POINT DE DÉPART, PAS UN CARCAN. Il pose une CHAÎNE et
 * ses CALQUES ; tout s'y modifie ensuite, scène par scène, dans le panneau
 * Montage de l'Atelier — lettre, tours, lignes qui sonnent, ordre, et la liste
 * elle-même. « Il faut pouvoir monter le morceau comme on le souhaite :
 * choisir la structure parmi des presets ou la créer de toute pièce. »
 *
 * ⚠️ IL NE PORTE PLUS DE BOUTONS, et c'est un arbitrage du 2026-09-09 :
 * « on peut laisser tomber le choix des boutons associés aux paramètres, ça ne
 * fait pas ses preuves ». Un montage qui remplaçait six assignations obligeait
 * à un loquet « conserver mes boutons » dans ⚙ et à une case à cocher de plus à
 * l'ouverture d'un fichier ; les deux coûtaient en lisibilité ce que la
 * fonction ne rendait pas. Désormais RIEN ne touche aux boutons déjà réglés —
 * ni un montage, ni un fichier de morceau — et il n'y a plus de coche.
 */
export interface Montage {
  nom: string;
  /** Une ligne, lue sur le bouton qui le charge. */
  desc: string;
  sections: Section[];
}

export const MONTAGES: Montage[] = [
  /* ⚠️ CHAQUE MONTAGE A UN RELIEF, et c'est une correction du 2026-09-08.
   * Yann : « pas convaincu des organisations de morceaux, il n'y a pas assez
   * de mute et de modifs dans les presets d'assemblages ». Compté avant :
   * 13 scènes sur 38 portaient un calque, et **AABA comme RONDO n'en avaient
   * aucun** — leurs lettres répétées sonnaient donc strictement pareil. Or
   * c'est le calque qui fait la différence entre une forme et une liste.
   *
   * Trois règles tenues par `tests/architecture.test.ts` :
   *  - une chaîne ENTRE et SORT (un calque à chaque bout) ;
   *  - deux scènes qui citent la même lettre ne sonnent pas toutes pareil ;
   *  - le climax et le refrain restent PLEINS — un morceau sans moment plein
   *    n'a pas de relief non plus, seulement des trous.
   */
  {
    nom: 'BOUCLE',
    desc: 'A en boucle — les mains font tout',
    sections: [sec('BOUCLE', 'A', 4)],
  },
  {
    /* L'exemple 1 de Yann. Les deux COUPLETS ne sonnent pas pareil : le
       premier entre dépouillé, le second revient plein — c'est la variation la
       plus courante de la pop, et elle ne coûte pas un motif de plus. */
    nom: 'COUPLET / REFRAIN',
    desc: 'Intro · A B A B · pont · B · outro',
    sections: [
      sec('INTRO', 'A', 1, CALQUE_ENTREE),
      sec('COUPLET', 'A', 2, CALQUE_DEPOUILLE),
      sec('REFRAIN', 'B', 2),
      sec('COUPLET', 'A', 2),
      sec('REFRAIN', 'B', 2),
      sec('PONT', 'A', 1, CALQUE_PONT),
      sec('REFRAIN', 'B', 2),
      sec('OUTRO', 'B', 1, CALQUE_SORTIE),
    ],
  },
  {
    /* L'exemple 2 : « ABB′ABB′A′ outro ». Les deux B′ diffèrent — le premier
       allège, le second casse. */
    nom: 'A B B′',
    desc: 'A B B′ · A B B′ · A′ · outro',
    sections: [
      sec('A', 'A', 1, CALQUE_ENTREE),
      sec('A', 'A', 2),
      sec('B', 'B', 2),
      sec('B PRIME', 'B', 2, CALQUE_PONT),
      sec('A', 'A', 2, CALQUE_DEPOUILLE),
      sec('B', 'B', 2),
      sec('B PRIME', 'B', 1, CALQUE_BREAK),
      sec('OUTRO', 'A', 1, CALQUE_SORTIE),
    ],
  },
  {
    /* ⚠️ La forme de 32 mesures, et le seul montage où le calque n'est pas un
       ornement mais le SUJET : AABA n'a que deux matières, donc ce sont les
       traitements qui doivent différer. Le premier A énonce le thème nu, le
       second le remplit, le dernier le laisse partir. Sur un cycle de 4, « ×2 »
       vaut 8 mesures : la forme tombe exactement sur A(8) A(8) B(8) A(8). */
    nom: 'AABA',
    desc: 'La forme de 32 mesures — deux matières, trois traitements',
    sections: [
      sec('A', 'A', 2, CALQUE_SQUELETTE),
      sec('A', 'A', 2),
      sec('B', 'B', 2, CALQUE_SANS_BATTERIE),
      sec('A', 'A', 2, CALQUE_SORTIE),
    ],
  },
  {
    /* Le seul montage qui demande TROIS motifs. Le refrain A reste PLEIN à
       chaque retour — c'est lui l'ancre ; ce sont les épisodes qui contrastent,
       et ils contrastent différemment l'un de l'autre. */
    nom: 'RONDO',
    desc: 'A B A C A — le refrain revient entre deux contrastes',
    sections: [
      /* ⚠️ L'INTRO est une scène À PART, et c'est la seule sortie propre : la
         règle « une chaîne entre et sort » voulait un calque sur la première
         scène, mais un rondo énonce son refrain PLEIN dès la première fois.
         Affaiblir la règle pour faire rentrer RONDO aurait été le mauvais
         arbitrage ; lui donner quatre mesures d'entrée garde les deux vraies. */
      sec('INTRO', 'A', 1, CALQUE_ENTREE),
      sec('A', 'A', 2),
      sec('B', 'B', 2, CALQUE_DEPOUILLE),
      sec('A', 'A', 2),
      sec('C', 'C', 2, CALQUE_SANS_BATTERIE),
      sec('A', 'A', 2, CALQUE_SORTIE),
    ],
  },
  {
    /* Trois matières, puis les mêmes ALLÉGÉES — ici le second passage ne change
       pas de motifs, seulement de densité. C'est la forme où le calque porte
       tout le travail. */
    nom: 'A B C · A B′ C′',
    desc: 'Trois matières, puis les mêmes en retrait',
    sections: [
      sec('INTRO', 'A', 1, CALQUE_ENTREE),
      sec('A', 'A', 2),
      sec('B', 'B', 2),
      sec('C', 'C', 2),
      sec('A PRIME', 'A', 2, CALQUE_DEPOUILLE),
      sec('B PRIME', 'B', 2, CALQUE_PONT),
      sec('C PRIME', 'C', 1, CALQUE_SORTIE),
    ],
  },
  {
    /* L'arc d'INTENSITÉ — une seule lettre, ce sont les LIGNES qui font le
       morceau. La RELANCE est ce qui manquait : après un break, le beat revient
       seul une mesure avant que tout retombe, sinon les deux climax
       s'enchaînent sans qu'on entende qu'on y revient. Longueurs conformes à la
       convention (intro 16, montée 16, drop 32 mesures sur un cycle de 4). */
    nom: 'CLUB',
    desc: 'Une seule partie — intro, montée, climax, break, relance',
    sections: [
      sec('INTRO', 'A', 2, CALQUE_ENTREE),
      sec('MONTÉE', 'A', 2, CALQUE_MONTEE),
      sec('CLIMAX', 'A', 4),
      sec('BREAK', 'A', 1, CALQUE_BREAK),
      sec('RELANCE', 'A', 1, CALQUE_SQUELETTE),
      sec('CLIMAX', 'A', 4),
      sec('SORTIE', 'A', 2, CALQUE_SORTIE),
    ],
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

/* ---- MONTER SOI-MÊME ----
 *
 * ⚠️ UN MODÈLE EST UN DÉPART, PAS UNE IDENTITÉ. Yann : « choisir la structure
 * comme on le souhaite, parmi des presets ou la créer de toute pièce ». Tout ce
 * qui suit est la part PURE de cette édition — l'ajout, la copie, le
 * déplacement, le retrait, et la bascule d'une ligne dans un calque. Le store
 * n'en fait que le câblage réactif et l'écriture sur disque, si bien que la
 * règle qui compte se teste sans navigateur.
 *
 * ⚠️ LE NOM D'UNE CHAÎNE ÉDITÉE N'EST PLUS CELUI DU MODÈLE. Garder « RONDO »
 * sur une chaîne dont on a retiré trois scènes ferait mentir le seul mot que
 * l'écran affiche en grand. `montageFrais` continue de poser le nom du modèle ;
 * dès qu'une scène bouge, le store passe par `nomEdite`.
 */

/** L'ordre dans lequel les lignes se lisent partout — batterie puis synthé. */
export const LIGNES_ORDRE: LineName[] = [...DRUM_ROW_NAMES, ...SYNTH_ROW_NAMES];

/** Les calques nommés, offerts en raccourci par l'éditeur. */
export const CALQUES_NOMMES: Array<{ nom: string; lignes: LineName[] }> = [
  { nom: 'ENTRÉE', lignes: CALQUE_ENTREE },
  { nom: 'DÉPOUILLÉ', lignes: CALQUE_DEPOUILLE },
  { nom: 'SQUELETTE', lignes: CALQUE_SQUELETTE },
  { nom: 'MONTÉE', lignes: CALQUE_MONTEE },
  { nom: 'PONT', lignes: CALQUE_PONT },
  { nom: 'BREAK', lignes: CALQUE_BREAK },
  { nom: 'SANS BATTERIE', lignes: CALQUE_SANS_BATTERIE },
  { nom: 'SORTIE', lignes: CALQUE_SORTIE },
];

/** Une scène neuve, avec un identifiant à elle — les clés de `{#each}` en vivent. */
export function nouvelleSection(
  nom = 'SCÈNE',
  partie: PartieId = 'A',
  cycles = 2,
  lignes: LineName[] | null = null,
): Section {
  return { id: `sec-${++compteur}`, nom, partie, cycles, lignes: lignes ? [...lignes] : null };
}

/** Le point de départ de « de toute pièce » : une scène pleine, et rien d'autre. */
export function chaineVierge(): Architecture {
  return { nom: 'MON MORCEAU', sections: [nouvelleSection('SCÈNE 1', 'A', 2)] };
}

/**
 * Le nom que porte une chaîne qu'on vient de modifier.
 *
 * Un modèle édité n'est plus ce modèle : on le dit une fois, on ne l'empile
 * pas (« RONDO (modifié) (modifié) » est le défaut qu'on évite ici).
 */
export function nomEdite(nom: string): string {
  if (montageParNom(nom) === null) return nom;
  return `${nom} (modifié)`;
}

/**
 * Bascule une ligne dans le calque d'une section, et rend le calque suivant.
 *
 * ⚠️ `null` VEUT DIRE « TOUTES », pas « aucune » — retirer une ligne d'une
 * section pleine part donc de la liste complète, jamais d'un tableau vide.
 * Et une section qui retrouve toutes ses lignes redevient `null` : sans ça
 * elle resterait affichée « A′ » alors qu'elle sonne exactement comme A.
 */
export function basculerLigne(lignes: LineName[] | null, ligne: LineName): LineName[] | null {
  const base = lignes === null ? [...LIGNES_ORDRE] : lignes;
  const suivant = base.includes(ligne)
    ? base.filter((l) => l !== ligne)
    : LIGNES_ORDRE.filter((l) => base.includes(l) || l === ligne);
  return suivant.length === LIGNES_ORDRE.length ? null : suivant;
}

/** Déplacer une scène d'un cran — hors bornes, la liste ne bouge pas. */
export function deplacerSection(sections: Section[], index: number, delta: number): Section[] {
  const cible = index + delta;
  if (index < 0 || index >= sections.length || cible < 0 || cible >= sections.length) return sections;
  const copie = [...sections];
  const [s] = copie.splice(index, 1);
  copie.splice(cible, 0, s);
  return copie;
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
