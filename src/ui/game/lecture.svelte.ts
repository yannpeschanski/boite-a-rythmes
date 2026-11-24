/* La LECTURE en cours d'un écran de récit — partagée entre le texte qui se
 * tape (`RecitLignes`) et le bouton qui fait avancer (`CarriereView`).
 *
 * ⚠️ Demande de Yann (2026-11-24) : *« il faudrait qu'on puisse compléter le
 * texte sans attendre que tout défile, en appuyant sur le bouton suivant par
 * exemple »*. Toucher le texte le complétait déjà — mais c'était un geste
 * CACHÉ (« sur cette surface, ce qui n'est pas écrit n'existe pas »), et le
 * bouton, lui, passait à l'écran suivant en emportant le texte non lu.
 *
 * La règle, celle des jeux à récit : le PREMIER appui sur le bouton principal
 * complète le texte, le second fait ce que dit le bouton. Et le bouton le DIT
 * — « Tout afficher ▸ » tant que ça défile.
 *
 * Un seul écran de récit est affiché à la fois : un état de module suffit, et
 * évite de faire remonter une référence de composant à travers six branches. */

export const lecture = $state({
  /** Le texte de l'écran est entièrement affiché (vrai s'il n'y en a pas). */
  fini: true,
  /** Complète le texte d'un coup. Posé par le `RecitLignes` monté. */
  sauter: (): void => {},
});

/** Enveloppe une action de bouton : tant que le texte défile, l'appui le
 *  complète au lieu d'agir. */
export function apresLecture(action: () => void): () => void {
  return () => {
    if (!lecture.fini) {
      lecture.sauter();
      return;
    }
    action();
  };
}
