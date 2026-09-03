/* L'ARCHITECTURE D'UN MORCEAU — le macro-séquenceur du Mode Live.
 *
 * Une architecture est une liste de SECTIONS jouées dans l'ordre ; chaque
 * section dit quel motif jouer, combien de tours, et quelles lignes sonnent.
 * C'est le « 8 cycles de A puis 8 cycles de B » demandé par Yann, et l'étude
 * qui l'a cadré est dans docs/plan/06-audit-architectures-de-morceau.md.
 *
 * ⚠️ CE QUE LE CHANTIER APPORTE N'EST PAS LA POSSIBILITÉ, C'EST LA JOUABILITÉ.
 * Deux entrées de banque portent déjà deux motifs complets, batteries
 * comprises, et on bascule de l'une à l'autre depuis le bandeau. Ce qui
 * manquait : la bascule est manuelle et tombe au milieu de la mesure. Ici elle
 * est déclenchée au compte et posée sur le temps (AudioEngine.queueSwapAtNextBar).
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

export interface Section {
  id: string;
  /** Ce qui s'affiche en gros pendant le set : « REFRAIN », « MONTÉE ». */
  nom: string;
  /**
   * Entrée de la banque de séquences à charger, ou `null` pour GARDER le motif
   * courant. Le `null` n'est pas un trou : c'est ce qui permet à un arc
   * d'intensité (intro → montée → climax) de se jouer sur une seule séquence,
   * en ne changeant que les lignes qui sonnent.
   */
  sequenceId: string | null;
  /** Nombre de tours du cycle propre du motif. Jamais un nombre de mesures. */
  cycles: number;
  /**
   * Les lignes qui sonnent dans cette section, ou `null` pour « toutes ».
   * C'est un CALQUE posé sur le motif, jamais une copie : une seule entrée de
   * banque sert ainsi d'intro, de couplet et de refrain.
   */
  lignes: LineName[] | null;
}

export interface Architecture {
  nom: string;
  sections: Section[];
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

/** La durée totale d'une architecture, en secondes, au tempo donné. */
export function dureeSecondes(sections: Section[], cycle: number, tempo: number): number {
  const mesure = 240 / Math.max(1, tempo);
  return sections.reduce((t, s) => t + mesuresDeSection(s, cycle) * mesure, 0);
}

/** « 1 min 44 » — la seule information que l'utilisateur lit vraiment. */
export function formaterDuree(secondes: number): string {
  const s = Math.round(secondes);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m} min ${String(s % 60).padStart(2, '0')}` : `${s} s`;
}

let compteur = 0;
function section(nom: string, cycles: number, lignes: LineName[] | null = null): Section {
  return { id: `sec-${++compteur}`, nom, sequenceId: null, cycles, lignes };
}

/* ---- Les modèles livrés d'usine ----
 *
 * Ils posent les sections et leurs longueurs ; il ne reste qu'à déposer une
 * séquence de banque dans chaque case. Les deux formes sont volontairement de
 * NATURES différentes, parce que les architectures de morceau le sont :
 *
 *  - POP est une chaîne de MOTIFS — chaque section a le sien ;
 *  - ARC est un arc d'INTENSITÉ — une seule séquence, ce sont les LIGNES qui
 *    entrent et sortent. C'est ce que le calque `lignes` sert à faire, et
 *    c'est pour ça qu'il n'est pas décoratif.
 */
export const MODELES: Architecture[] = [
  {
    nom: 'POP',
    sections: [
      section('INTRO', 2),
      section('COUPLET', 4),
      section('REFRAIN', 4),
      section('COUPLET', 4),
      section('REFRAIN', 4),
      section('PONT', 2),
      section('REFRAIN', 8),
      section('OUTRO', 2),
    ],
  },
  {
    nom: 'ARC',
    sections: [
      section('INTRO', 2, ['kick', 'hat']),
      section('MONTÉE', 4, ['kick', 'hat', 'snare', 'bass']),
      section('CLIMAX', 4, null),
      section('DESCENTE', 2, ['kick', 'pad']),
    ],
  },
  {
    nom: 'SONNERIE',
    sections: [section('HOOK', 2)],
  },
];

/** Une copie fraîche d'un modèle — les sections sont mutables côté store. */
export function modeleFrais(nom: string): Architecture | null {
  const m = MODELES.find((x) => x.nom === nom);
  if (!m) return null;
  return {
    nom: m.nom,
    sections: m.sections.map((s) => ({ ...s, id: `sec-${++compteur}`, lignes: s.lignes ? [...s.lignes] : null })),
  };
}
