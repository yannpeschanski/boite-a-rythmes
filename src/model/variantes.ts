/* LES TROIS VARIANTES — ce que le Mode Live propose SANS qu'on ait rien
 * préparé. L'étude est dans docs/plan/07-audit-mode-live-variantes.md.
 *
 * ⚠️ LE DÉFAUT QUE CE FICHIER EXISTE POUR RÉPARER. Chargé à froid, le modèle
 * POP jouait TRENTE FOIS LE MÊME MOTIF : ses huit cases attendaient une
 * séquence de banque, et sans banque préparée elles se rabattaient toutes sur
 * « le motif courant ». Une architecture qui ne change rien à ce qu'on entend
 * n'est pas une architecture, c'est une étiquette. Ici, les trois variantes
 * sont DÉRIVÉES de la boucle qu'on a sous la main : il n'y a plus rien à
 * préparer, donc plus rien à oublier de préparer.
 *
 * ⚠️ UNE VARIANTE EST UN CALQUE, JAMAIS UNE COPIE. Elle ne dit que les lignes
 * qui sonnent — le motif n'est pas touché, donc revenir au PLEIN est gratuit
 * et rien ne diverge. C'est le même mécanisme que le calque d'une section
 * (`Section.lignes`), et c'est pour ça qu'il ne fallait pas en écrire un
 * deuxième.
 */
import type { PatternStateV2, LineName } from './types';
import { DRUM_ROW_NAMES, SYNTH_ROW_NAMES } from './types';
import { ligneSonne } from './architecture';

export type VarianteId = 'retenue' | 'plein' | 'rupture';

export interface Variante {
  id: VarianteId;
  /** La lettre est FIXE par identité — A, B, C ne bougent pas de place. */
  lettre: 'A' | 'B' | 'C';
  nom: string;
  /** Les lignes qui sonnent dans cette variante. Jamais vide (voir plus bas). */
  lignes: LineName[];
}

const TOUTES = [...DRUM_ROW_NAMES, ...SYNTH_ROW_NAMES] as LineName[];

/* ⚠️ L'ORDRE DE RETRAIT, ET POURQUOI IL EST UN RANG ET NON UNE LISTE.
 *
 * Une première version retirait une liste FIXE (`clap`, `shaker`, `melody`).
 * Mesurée : zéro collision sur les 34 presets… et RETENUE = PLEIN sur le motif
 * d'accueil, qui n'a ni clap, ni shaker, ni mélodie. C'est-à-dire deux boutons
 * identiques sur le seul motif que le Mode Live propose à froid — la règle
 * échouait exactement là où elle sert.
 *
 * On retire donc ce qui EST LÀ, pas ce qui est nommé : les premières lignes de
 * cet ordre présentes dans la boucle. Du plus ornemental au plus fondateur.
 */
const ORDRE_DE_RETRAIT: LineName[] = [
  'melody',
  'clap',
  'shaker',
  'pad',
  'hat',
  'snare',
  'bass',
  'kick',
];

/** Le SOCLE — ce qui tient le sol. La rupture est la boucle sans lui. */
const SOCLE: LineName[] = ['kick', 'snare', 'clap'];

/** Les lignes de la boucle qui sonnent vraiment, dans l'ordre d'affichage. */
export function lignesQuiSonnent(state: PatternStateV2): LineName[] {
  return TOUTES.filter((l) => ligneSonne(state, l));
}

/**
 * Les variantes d'une boucle — une à trois, jamais plus, jamais de doublon.
 *
 * ⚠️ Une variante VIDE ou IDENTIQUE à une autre n'est pas rendue : un bouton
 * qui ne change rien à ce qu'on entend est exactement le défaut qu'on répare.
 * Sur une boucle d'une seule ligne il ne reste donc que PLEIN, et c'est la
 * bonne réponse — il n'y a rien à en retirer.
 *
 * ⚠️ La dérivation lit l'INVENTAIRE des lignes, pas la musique : mesurée sur
 * les 34 presets, RETENUE ne prend que quatre formes distinctes. C'est un
 * point de DÉPART jouable en zéro geste, pas une composition — d'où le
 * séquenceur du Mode Live, qui reste le moyen d'en couper une de plus.
 */
export function variantesDe(state: PatternStateV2): Variante[] {
  const plein = lignesQuiSonnent(state);
  /* Deux lignes retirées dès qu'il y a de quoi ; une seule sur une boucle
     maigre, sinon RETENUE devient un trou plutôt qu'une retenue. */
  const aRetirer = ORDRE_DE_RETRAIT.filter((l) => plein.includes(l)).slice(0, plein.length >= 5 ? 2 : 1);
  const retenue = plein.filter((l) => !aRetirer.includes(l));
  const rupture = plein.filter((l) => !SOCLE.includes(l));

  /* PLEIN est la RÉFÉRENCE : c'est la boucle telle qu'elle a été composée.
     C'est donc lui qu'on garde quand une autre variante lui est identique,
     jamais l'inverse — d'où l'ordre de ce tableau, différent de l'ordre
     d'affichage rétabli juste après. */
  const parPriorite: Variante[] = [
    { id: 'plein', lettre: 'B', nom: 'PLEIN', lignes: plein },
    { id: 'retenue', lettre: 'A', nom: 'RETENUE', lignes: retenue },
    { id: 'rupture', lettre: 'C', nom: 'RUPTURE', lignes: rupture },
  ];
  const vues = new Set<string>();
  const gardees = parPriorite.filter((v) => {
    if (!v.lignes.length) return false;
    const cle = v.lignes.join(' ');
    if (vues.has(cle)) return false;
    vues.add(cle);
    return true;
  });
  return gardees.sort((a, b) => a.lettre.localeCompare(b.lettre));
}

/** Le calque à poser pour une variante — `null` pour PLEIN : on RELÂCHE.
 *
 * ⚠️ PLEIN ne force pas les lignes ouvertes, il rend la main au motif. Forcer
 * rouvrirait une ligne coupée dans l'Atelier, ce que le Mode Live ne doit
 * jamais faire dans le dos de qui l'a coupée (même règle que `Section.lignes`
 * à `null`). */
export function calqueDe(v: Variante): LineName[] | null {
  return v.id === 'plein' ? null : v.lignes;
}
