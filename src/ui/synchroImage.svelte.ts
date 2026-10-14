/* Le décalage IMAGE / SON, réglé à l'œil — pour TOUS les modes.
 *
 * ⚠️ Pourquoi il existe (2026-10-14). La case qui avance suit l'horloge du son
 * que le navigateur CROIT faire entendre : `audioTime()` retranche le retard
 * de sortie qu'il DÉCLARE. Or ce chiffre ment selon l'appareil — Firefox +
 * casque Bluetooth annonce ~22 ms pour ~180 réels, Chrome Android ~416 pour
 * ~180. Au casque, la case allumée tombait donc ~160 ms avant le coup, et
 * « la lecture du rythme [était] bancale » — surtout depuis que l'acte 0 se
 * LIT sur la grille. Aucune API ne donne le vrai chiffre : il se règle.
 *
 * Ce n'est PAS le calibrage d'entrée (`latence.svelte.ts`) : celui-là mesure
 * des FRAPPES, donc la dalle tactile en plus du son ; celui-ci aligne une
 * IMAGE sur un SON, sans geste — c'est le réglage « audio/vidéo » des jeux de
 * rythme. Le confondre ferait porter le retard du doigt à l'écran.
 *
 * Propriété de l'APPAREIL, hors format v2, comme `latence` et `sortie`. Le
 * moteur le lit par un crochet statique (`AudioEngine.decalageImage`) : trois
 * vues construisent chacune leur moteur, et il n'y a qu'un écran.
 */
import { AudioEngine } from '../engine/AudioEngine';

const KEY = 'boite-a-rythme:decalage-image';

/* Un casque Bluetooth va jusqu'à ~300 ms ; un navigateur qui SUR-déclare
   (Chrome Android) met l'image en retard, d'où un peu de négatif. */
export const IMAGE_MIN_MS = -150;
export const IMAGE_MAX_MS = 400;

class SynchroImage {
  /* Millisecondes dont l'image attend le son. Positif = le son arrive plus
     tard que ce que le navigateur annonce (casque Bluetooth). */
  ms = $state(0);

  charger(): void {
    try {
      const brut = Number(localStorage.getItem(KEY));
      this.appliquer(Number.isFinite(brut) ? brut : 0);
    } catch {
      /* stockage refusé : on repart de zéro */
    }
  }

  regler(ms: number): void {
    this.appliquer(ms);
    try {
      localStorage.setItem(KEY, String(this.ms));
    } catch {
      /* stockage refusé : le réglage vaut pour la session */
    }
  }

  private appliquer(ms: number): void {
    this.ms = Math.max(IMAGE_MIN_MS, Math.min(IMAGE_MAX_MS, Math.round(ms)));
    AudioEngine.decalageImage = this.ms / 1000;
  }
}

export const synchroImage = new SynchroImage();
