/* Le décalage d'entrée du joueur, mesuré sur SON appareil.
 *
 * Pourquoi ce module existe
 * -------------------------
 * Entre le doigt qui touche la dalle et le code qui date la frappe, il y a la
 * dalle, le système, la file d'événements du navigateur ; entre le code qui
 * programme un son et l'oreille qui l'entend, il y a le tampon de sortie et,
 * en Bluetooth, une bonne centaine de millisecondes. Le moteur compense ce
 * qu'il PEUT connaître (`AudioEngine.audioTime`), mais WebKit ne renseigne pas
 * `outputLatency` et personne ne renseigne la latence d'entrée. Le reste ne se
 * devine pas : il se mesure, une fois, sur l'appareil qui joue.
 *
 * Ce n'est ni de l'état de morceau ni de la progression : c'est une propriété
 * de l'APPAREIL. Il vit donc hors du format v2, comme `paramHints` et
 * `lastTouched` (voir CLAUDE.md), et se range sous sa propre clé — un même
 * joueur sur deux appareils n'a pas le même décalage, et un même appareil
 * partagé par deux joueurs a le même.
 */

const KEY = 'boite-a-rythme:latence-entree';

/* Bornes de bon sens. Au-delà d'une demi-seconde ce n'est plus une latence,
 * c'est une frappe ratée — accepter n'importe quoi laisserait un calibrage
 * accidentel rendre le jeu impossible sans qu'on comprenne pourquoi. */
const MAX_MS = 400;

class Latence {
  /* Millisecondes à retrancher de chaque frappe. Positif = le joueur est
     mesuré en retard, donc on avance sa frappe d'autant. */
  ms = $state(0);

  charger(): void {
    try {
      const brut = Number(localStorage.getItem(KEY));
      this.ms = Number.isFinite(brut) ? this.borner(brut) : 0;
    } catch {
      /* stockage refusé : on repart de zéro, le jeu reste jouable */
    }
  }

  regler(ms: number): void {
    this.ms = this.borner(ms);
    try {
      localStorage.setItem(KEY, String(this.ms));
    } catch {
      /* stockage refusé : le réglage vaut pour la session */
    }
  }

  /* Ajoute un décalage mesuré à celui déjà en place.
   *
   * ADDITIF et non remplaçant : les frappes d'une partie sont déjà corrigées
   * par le réglage courant, donc leur médiane est ce qu'il RESTE à corriger.
   * Remplacer effacerait la correction précédente et ferait osciller le réglage
   * d'une partie à l'autre au lieu de le faire converger. */
  affiner(medianeMs: number): void {
    this.regler(this.ms + medianeMs);
  }

  private borner(ms: number): number {
    return Math.max(-MAX_MS, Math.min(MAX_MS, Math.round(ms)));
  }
}

export const latence = new Latence();
