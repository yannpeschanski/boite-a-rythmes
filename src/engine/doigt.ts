/* QUAND part une note jouée AU DOIGT — les trois SOLO du Mode Live.
 *
 * ⚠️ « Dans le Mode Live, les pads arrivent en retard » (2026-10-20). Deux
 * retards s'additionnaient, et un seul est physique :
 *  - la SORTIE (casque Bluetooth : 150 à 250 ms ; Chrome Android : un tampon
 *    de 171 ms). Aucune page ne fait sonner une note avant que le doigt la
 *    demande — un lecteur vidéo ne le fait pas non plus, il RETARDE L'IMAGE,
 *    ce qui n'a de sens que pour un contenu connu d'avance ;
 *  - l'ESCALIER de `currentTime`. Une note partie à `currentTime + 8 ms`
 *    s'entendait entre zéro et une marche plus tard selon l'instant du doigt :
 *    jusqu'à 171 ms d'IRRÉGULARITÉ. Un retard constant s'apprend en
 *    anticipant ; un retard irrégulier fait jouer « n'importe quoi ».
 *
 * D'où deux règles, et seulement deux :
 *  1. le retard est CONSTANT — la note est datée au doigt (`audioTimeA`) et
 *     part au plus grand écart rendu → entendu vu sur la dernière seconde.
 *     Le prix : une demi-marche de plus en moyenne, contre zéro irrégularité ;
 *  2. quand ce retard S'ENTEND (`RETARD_AUDIBLE_S`), elle part sur la
 *     PROCHAINE CASE de sa ligne — toujours dans le groove, au moment où la
 *     case s'allume. Arbitré « seulement si retard audible » : au filaire et
 *     au haut-parleur rapide, le pad reste libre entre les cases.
 *
 * Pur et sans Web Audio : `tests/doigt.test.ts` tient le calcul,
 * `tests/horloge-moteur.test.ts` le câblage.
 */

/** Au-delà, le décalage s'entend quand on joue au doigt (Wessel & Wright :
 *  30 ms). La seule définition — `ui/latenceVerdict.ts` la relit. */
export const RETARD_AUDIBLE_S = 0.04;

/** L'écart de retour : sans lui, un retard qui oscille autour du seuil
 *  ferait passer le pad de libre à calé d'une note à l'autre. */
export const HYSTERESE_S = 0.01;

export interface Doigt {
  /** `currentTime` au moment de programmer. */
  maintenant: number;
  /** L'heure ENTENDUE à l'instant du doigt, ou null si on ne la connaît pas. */
  entendu: number | null;
  /** Le plus grand écart `currentTime − entendu` vu récemment, ou null. */
  avanceRendu: number | null;
}

/* L'instant de rendu où la note part, avant toute grille.
 *
 * `entendu + avanceRendu` est l'instant de rendu qui correspondait au doigt
 * quand l'escalier était au plus haut : programmée là, la note s'entend
 * toujours `avanceRendu + avance` après le doigt, quelle que soit la marche.
 * Sans l'une des deux mesures (lecture arrêtée, horloge pas encore établie),
 * on retombe sur « tout de suite », comme avant. */
export function instantDuDoigt(d: Doigt, avance: number): number {
  const auPlusTot = d.maintenant + avance;
  if (d.entendu === null || d.avanceRendu === null) return auPlusTot;
  return Math.max(auPlusTot, d.entendu + d.avanceRendu + avance);
}

/* La case où part une note calée sur la grille.
 *
 * ⚠️ On vise la case depuis l'instant du DOIGT, et on ne la repousse que si
 * c'est ELLE qui est passée — pas l'instant brut. Un gestionnaire appelé une
 * image après le doigt (Chrome livre l'entrée à la synchro verticale) ne doit
 * pas faire sauter une case qui a encore 60 ms devant elle : sinon le choix de
 * la case dépendrait de nouveau de la marche, ce que ce module retire. */
export function caseDuDoigt(d: Doigt, avance: number, g: Grille): number {
  const auPlusTot = d.maintenant + avance;
  const vise = d.entendu === null || d.avanceRendu === null ? auPlusTot : d.entendu + d.avanceRendu + avance;
  const c = caseSuivante(vise, g);
  return c >= auPlusTot - 1e-9 ? c : caseSuivante(auPlusTot, g);
}

/* Faut-il caler sur la grille ? `retard` est celui que la note AURA : le doigt
 * jusqu'à l'oreille, dalle tactile exclue. */
export function calerSurLaGrille(retard: number, dejaCale: boolean): boolean {
  return retard >= (dejaCale ? RETARD_AUDIBLE_S - HYSTERESE_S : RETARD_AUDIBLE_S);
}

/** Une ligne telle que l'ordonnanceur la pose. */
export interface Grille {
  /** Une case connue de la ligne, sur l'horloge du rendu, sans décalage. */
  repere: number;
  /** Son index dans la ligne. */
  index: number;
  /** La durée d'une case. */
  pas: number;
  /** Le nombre de cases de la ligne (le swing ne retarde que les impaires). */
  total: number;
  /** Ce que l'ordonnanceur ajoute à la case `col` : décalage, swing, traîne. */
  decalage: (col: number) => number;
}

/* La première case de la ligne qui tombe à `t` ou après — à l'instant exact
 * où l'ordonnanceur y poserait une note, swing compris.
 *
 * ⚠️ On balaie plusieurs cases au lieu de diviser : décalage (±½ case), swing
 * (jusqu'à ¾) et traîne s'additionnent, et deux cases voisines peuvent sortir
 * dans le désordre. La plus PROCHE qui n'est pas passée gagne. */
export function caseSuivante(t: number, g: Grille): number {
  const n0 = Math.floor((t - g.repere) / g.pas) - 3;
  let meilleure = Infinity;
  for (let n = n0; n <= n0 + 8; n++) {
    const col = (((g.index + n) % g.total) + g.total) % g.total;
    const tc = g.repere + n * g.pas + g.decalage(col);
    if (tc >= t - 1e-9 && tc < meilleure) meilleure = tc;
  }
  return Number.isFinite(meilleure) ? meilleure : t;
}
