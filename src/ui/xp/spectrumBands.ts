/* Lecture d'une barre de l'analyseur de spectre, partagée par les deux
 * visualiseurs (SpectrumAnalyser.svelte pour l'Atelier, le mode « BARRES » du
 * Mode Live). Une seule définition : le projet s'est déjà fait avoir par un
 * `.xp-btn` recopié dans six fichiers (constat C6), on ne recommence pas avec
 * la lecture des bandes.
 */

/* Une FFT est linéaire en fréquence, l'oreille entend en octaves. Prises
 * telles quelles, les 256 bandes d'une FFT à 512 mettraient tout ce qu'on
 * perçoit comme « grave et médium » dans la moitié gauche de l'affichage.
 * D'où une répartition géométrique.
 *
 * Le plafond à 30 % des bandes n'est pas de la paresse : à 48 kHz, la dernière
 * bande retenue tombe vers 7 kHz. Au-dessus, une boîte à rythmes ne produit
 * quasiment rien de soutenu — les garder, c'est réserver la moitié droite de
 * l'afficheur à du vide permanent, ce qui donne l'impression que l'analyseur
 * est cassé. C'est exactement ce que faisait la première version.
 */
/* Première bande utile et dernière : au-delà de 30 % des bins (≈7 kHz à
 * 48 kHz), une boîte à rythmes ne produit quasiment rien de soutenu. */
const PREMIER_BIN = 2;
const PART_UTILE = 0.3;

/* Nombre maximal de barres qui ait un sens pour un spectre donné.
 *
 * Ce plafond n'est pas cosmétique : au-delà, plusieurs barres voisines lisent
 * LE MÊME bin, et l'afficheur s'étire au lieu de se remplir. C'est ce qui
 * donnait un analyseur à moitié vide à 1280px — 104 barres pour 74 bins
 * utiles, donc trente barres qui répétaient la dernière valeur, silencieuse.
 */
export function barresMax(bins: number): number {
  return Math.max(8, Math.floor(bins * PART_UTILE) - PREMIER_BIN);
}

function bande(i: number, n: number, bins: number): [number, number] {
  const min = PREMIER_BIN;
  const max = Math.max(min + 1, Math.floor(bins * PART_UTILE));
  const lo = Math.round(min * Math.pow(max / min, i / n));
  const hi = Math.round(min * Math.pow(max / min, (i + 1) / n));
  return [lo, Math.max(lo + 1, hi)];
}

/* Niveau 0..1 d'une barre.
 *
 * Deux corrections d'affichage, et elles sont assumées comme telles — un
 * analyseur d'ampli n'a jamais été un instrument de mesure :
 *
 * 1. CRÊTE et non moyenne. Une moyenne sur une bande large écrase les
 *    transitoires, et un analyseur de percussions qui écrase les transitoires
 *    ne montre plus rien.
 * 2. PENTE croissante vers l'aigu. Un spectre musical décroît d'environ 3 dB
 *    par octave : sans compensation, les trois quarts droits de l'afficheur
 *    restent au ras du sol alors qu'on entend parfaitement le hat. C'est la
 *    même correction que fait n'importe quel analyseur grand public.
 */
export function niveauBarre(
  data: Uint8Array,
  i: number,
  n: number,
  bins: number,
): number {
  const [lo, hi] = bande(i, n, bins);
  let v = 0;
  for (let k = lo; k < hi && k < data.length; k++) v = Math.max(v, data[k]);
  v /= 255;
  return Math.min(1, v * (1 + 1.5 * (i / Math.max(1, n - 1))));
}

/* Le capuchon monte d'un coup et retombe lentement — c'est ce détail qui fait
 * « analyseur » plutôt que « barres animées ». La constante est réglée pour
 * une descente pleine hauteur en ~0,75 s à 60 images par seconde.
 */
export const CHUTE_CAPUCHON = 0.022;
