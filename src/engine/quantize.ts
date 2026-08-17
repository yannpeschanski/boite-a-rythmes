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
  /** Millisecondes écoulées depuis l'arrivée de ce pas. */
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
  if (!Number.isFinite(stepMs) || stepMs <= 0 || !Number.isFinite(elapsedMs) || elapsedMs < 0) return col;
  return elapsedMs > stepMs / 2 ? (col + 1) % steps : col;
}
