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
 * ⚠️ Quatre, pas plus. C'est une mesure, pas un avis : la bande du Mode Live
 * fait 832 px en 844 × 390, et elle porte AUSSI la chaîne de sections et les
 * deux commandes de jeu. Quatre pastilles y tiennent à 56 px, six les
 * ramèneraient sous le seuil tactile. Et une forme de morceau au-delà de trois
 * lettres n'existe pratiquement pas.
 */

export const PARTIES = ['A', 'B', 'C', 'D'] as const;
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
