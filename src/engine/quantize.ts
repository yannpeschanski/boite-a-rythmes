// Quantification d'un geste joué à la main vers un pas de la grille.
//
// Utilisé par le pad d'écriture de l'Atelier (`ui/sequencer/NotePad.svelte`).
// Module PUR — pas de rune, pas de DOM, pas d'horloge : le temps écoulé est
// passé en paramètre plutôt que lu ici. C'est ce qui permet de tester le cas
// qui compte sans lancer l'appli ni Web Audio.
//
// LE DÉFAUT QU'ON ÉVITE : écrire sur le pas EN COURS. Un doigt tombe toujours
// un peu après le temps ; si on écrit systématiquement sur le pas courant,
// une note jouée juste avant le pas suivant est rangée sur le précédent, et
// tout le motif enregistré sonne en retard d'un pas. On arrondit donc au pas
// le PLUS PROCHE, comme le ferait n'importe quelle boîte à rythmes.

export interface QuantizeInput {
  /** Pas dont le moteur vient de signaler l'arrivée. */
  playheadCol: number;
  /** Millisecondes écoulées depuis l'arrivée de ce pas. Peut être NÉGATIF une
   *  fois le décalage d'entrée retranché : la frappe vise alors un pas déjà
   *  passé. */
  elapsedMs: number;
  /** Durée d'un pas de CETTE ligne, en millisecondes. */
  stepMs: number;
  /** Nombre de pas du cycle (pour le repli). */
  steps: number;
}

/**
 * Pas sur lequel écrire la note. Arrondit au plus proche : au-delà de la
 * moitié du pas courant, c'est le suivant qui est visé (avec repli en fin de
 * cycle).
 */
export function quantizeToStep({ playheadCol, elapsedMs, stepMs, steps }: QuantizeInput): number {
  if (steps <= 0) return 0;
  const col = ((playheadCol % steps) + steps) % steps;
  // Durée invalide (tempo aberrant, pas encore de repère de temps) : on ne
  // devine pas, on garde le pas courant plutôt que d'inventer un décalage.
  if (!Number.isFinite(stepMs) || stepMs <= 0 || !Number.isFinite(elapsedMs)) return col;
  // Arrondi au pas le plus proche, EN AVANT COMME EN ARRIÈRE.
  //
  // ⚠️ Un `elapsedMs < 0` renvoyait auparavant le pas courant, au motif qu'un
  // temps écoulé négatif ne pouvait être qu'une absence de repère. Ce n'est
  // plus vrai : depuis que le pad retranche le décalage d'entrée mesuré de
  // l'appareil (voir NotePad), un temps écoulé négatif veut dire « la frappe
  // appartient au pas PRÉCÉDENT » — et c'est précisément le cas qu'on cherche
  // à corriger. L'ancien garde-fou rendait donc toute correction positive
  // SILENCIEUSEMENT sans effet : mesuré au navigateur, un décalage de 400 ms
  // écrivait exactement les mêmes colonnes que 0 ms.
  //
  // ⚠️ Les ÉGALITÉS vont vers zéro, pas vers le haut. La règle d'origine était
  // `elapsedMs > stepMs / 2` — strictement supérieur — donc pile à la moitié on
  // reste sur le pas courant, et un test le verrouille depuis. `Math.round`
  // arrondit 0,5 vers le haut et cassait ce contrat ; on garde la règle, et on
  // la reflète simplement de l'autre côté de zéro.
  const x = elapsedMs / stepMs;
  const n = Math.sign(x) * Math.ceil(Math.abs(x) - 0.5);
  return (((col + n) % steps) + steps) % steps;
}
