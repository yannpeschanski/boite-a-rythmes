/* Le tampon de sortie, réglé à la main — pour quand le navigateur ne dit rien.
 *
 * La règle et son seuil vivent dans `engine/tampon.ts` (module pur, lu par le
 * moteur). Ce fichier-ci ne fait que deux choses que le moteur n'a pas le droit
 * de faire : persister le choix, et le rendre réactif pour le menu.
 *
 * POURQUOI UN RÉGLAGE, alors qu'il y a une détection automatique. Parce que la
 * détection lit `outputLatency`, et que ce chiffre est un aveu volontaire :
 * WebKit ne le déclare pas du tout, et rien n'oblige un Android à y faire
 * figurer le retard de sa route Bluetooth. Quelqu'un qui ENTEND crachoter en
 * sait alors plus que le navigateur — il lui faut un interrupteur, sinon la
 * seule sortie est de ne pas se servir de l'appli.
 *
 * Propriété de l'APPAREIL, comme le décalage d'entrée (`latence.svelte.ts`) :
 * hors du format v2, sous sa propre clé, jamais dans l'historique d'annulation.
 */
import { setPreferenceTampon, type PreferenceTampon } from '../engine/tampon';

const KEY = 'boite-a-rythme:tampon-sortie';

const VALEURS: PreferenceTampon[] = ['auto', 'large', 'court'];

/* Libellés écrits du point de vue de ce qu'on ENTEND, pas du tampon : personne
 * n'ouvre un menu pour choisir une taille de bloc audio. */
export const LIBELLES: Record<PreferenceTampon, string> = {
  auto: 'Auto',
  large: 'Confort (Bluetooth)',
  court: 'Réactif (filaire)',
};

class Sortie {
  preference = $state<PreferenceTampon>('auto');

  charger(): void {
    let brut: string | null = null;
    try {
      brut = localStorage.getItem(KEY);
    } catch {
      /* stockage refusé : on reste sur 'auto', le jeu et l'appli marchent */
    }
    this.appliquer(VALEURS.includes(brut as PreferenceTampon) ? (brut as PreferenceTampon) : 'auto');
  }

  regler(p: PreferenceTampon): void {
    this.appliquer(p);
    try {
      localStorage.setItem(KEY, p);
    } catch {
      /* stockage refusé : le réglage vaut pour la session */
    }
  }

  /* Le menu n'a qu'un bouton : on tourne. Trois états seulement, et l'ordre
     va du plus automatique au plus explicite. */
  suivant(): void {
    this.regler(VALEURS[(VALEURS.indexOf(this.preference) + 1) % VALEURS.length]);
  }

  private appliquer(p: PreferenceTampon): void {
    this.preference = p;
    // ⚠️ Le moteur ne lit PAS ce store (il n'importe rien de Svelte) : c'est
    // l'interface qui lui pousse la valeur. Un oubli ici et le réglage
    // n'aurait aucun effet — le défaut de câblage habituel du projet.
    setPreferenceTampon(p);
  }
}

export const sortie = new Sortie();
