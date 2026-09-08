/* LES PARTIES — A, B, C, D.
 *
 * ⚠️ POURQUOI CE FICHIER EXISTE, ET CE QU'IL REMPLACE. La bande d'architecture
 * pointait des entrées de BANQUE : une liste plate de séquences aux noms
 * libres. Trois conséquences mesurées, et c'est ce que Yann appelait « trop
 * compliqué et pas du tout audible » :
 *
 *  1. rien dans une liste de noms libres ne dit « ceci est le A, cela est
 *     le B » — or une architecture de morceau ne se pense QU'EN LETTRES ;
 *  2. remplir le modèle POP demandait HUIT allers-retours dans un sélecteur
 *     de l'overlay ⚙, une par section ;
 *  3. tant que ces huit voyages n'étaient pas faits, les huit sections
 *     portaient `sequenceId: null`, c'est-à-dire jouaient TOUTES le motif
 *     courant. L'état par défaut de la fonctionnalité était donc
 *     l'inaudible — on entendait exactement la même chose du début à la fin.
 *
 * Ici une partie est une LETTRE, il y en a quatre, et une section de
 * l'architecture cite une lettre. Ranger le motif courant sous A est un clic ;
 * « de A on développe B » est le même clic sur B après avoir modifié A.
 *
 * ⚠️ TROIS, arbitré par Yann (« partons sur 3 déjà »), et l'état de l'art lui
 * donne raison : sur les six formes de morceau courantes, CINQ tiennent avec
 * deux lettres et deux n'en demandent qu'une (voir docs/plan/08). La quatrième
 * ne servait à aucun des modèles livrés. La mesure ne s'y oppose pas non plus —
 * la bande du Mode Live fait 832 px en 844 × 390 et porte aussi la chaîne et
 * les deux commandes de jeu ; trois pastilles y sont plus à l'aise que quatre.
 */

export const PARTIES = ['A', 'B', 'C'] as const;
export type PartieId = (typeof PARTIES)[number];

export interface Partie {
  /** Le motif, sérialisé au format v2 (voir model/serialize). */
  json: string;
  /** Un nom libre, facultatif — la LETTRE reste l'identité. */
  nom: string;
  rangeeLe: number;
}

export function estPartieId(v: unknown): v is PartieId {
  return typeof v === 'string' && (PARTIES as readonly string[]).includes(v);
}

/** La lettre qui suit — pour « dériver la suivante » sans choisir soi-même. */
export function partieSuivante(id: PartieId): PartieId {
  return PARTIES[(PARTIES.indexOf(id) + 1) % PARTIES.length];
}
