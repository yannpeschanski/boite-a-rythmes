/* Le TUTORIEL du premier exercice (2026-11-24).
 *
 * Retour de Yann : *« les gens ne savaient pas quoi faire en voyant le premier
 * écran de jeu »*. Mesuré sur cet écran, en 390 px : onze éléments cliquables,
 * deux textes qui disent presque la même chose, et huit carrés gris sous le mot
 * « KICK 0/4 » — rien ne disait qu'il fallait les toucher, ni dans quel ordre
 * écouter, poser, vérifier.
 *
 * Arbitré : un PAS À PAS intégré au premier exercice, pas un écran à lire
 * avant. On avance en FAISANT le geste, jamais en cliquant « suivant » :
 *
 * 1. écouter — tant que la boucle n'a jamais été jouée ;
 * 2. poser   — tant qu'il manque des coups sur la grille ;
 * 3. vérifier.
 *
 * L'étape se DÉDUIT de l'état (pas de curseur à tenir à jour) : revenir en
 * arrière en effaçant une case ramène à l'étape 2, et c'est juste. */

export type EtapeTutoriel = 1 | 2 | 3;

export function etapeDuTutoriel(f: { ecoutes: number; posees: number; attendues: number }): EtapeTutoriel {
  if (f.ecoutes < 1) return 1;
  if (f.posees < f.attendues) return 2;
  return 3;
}

/** Ce que l'écran dit à chaque étape — une phrase, un geste. */
export function consigneDuTutoriel(e: EtapeTutoriel, f: { posees: number; attendues: number }): string {
  if (e === 1) return 'Appuie sur 🔊 Écouter, et compte les coups.';
  if (e === 2) {
    return `Touche une case pour chaque coup entendu — ${f.posees}/${f.attendues}. La case qui s’allume pendant l’écoute, c’est l’instant qui joue.`;
  }
  return 'Tu as posé tous les coups. Appuie sur ✓ Vérifier.';
}
